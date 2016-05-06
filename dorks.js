var fs = require('fs')
var system = require('system')
var pages = []
var userAgents = [
	"Mozilla/5.0 (X11; Linux i686; rv:40.0) Gecko/20100101 Firefox/40.0",
	"Opera/9.80 (X11; Linux i686; Ubuntu/14.10) Presto/2.12.388 Version/12.16",
	"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 6.2) AppleWebKit/535.7 (KHTML, like Gecko) Comodo_Dragon/16.1.1.0 Chrome/16.0.912.63 Safari/535.7",
	"Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1)"
]

function Google( site )
{
	var web_browser = require('webpage').create()
	var uri = 'http://www.google.com/'
	var dorks = []
	var query = ( site.trim() != '' ) ? 'site:' + site : ''
	var found_pages = 0
	var timeout = 0
	var captcha_retry_timeout = 0
	this.done = false
	web_browser.viewportSize = { width: 1280, height: 800 }
	web_browser.settings.userAgent = userAgents[ parseInt( Math.random() * userAgents.length ) ]
	web_browser.__this = this

	web_browser.onConsoleMessage = function(msg)
	{
		console.log(msg)
	}

	this.set_timeout = function( ms )
	{
		timeout = ms
		return this
	}

	this.set_captcha_retry_timeout = function( ms )
	{
		captcha_retry_timeout = ms
		return this
	}

	this.set_dork = function( dork )
	{
		dorks = dorks.concat( dork )
		return this
	}

	this.set_dorks = function( dorks_file )
	{
		dorks = dorks.concat( fs.isFile(dorks_file) ? fs.read(dorks_file).replace(/\r/g, '').split('\n').reverse().filter( function(a) { return a } ) : [] )
		return this
	}

	var save_state = function( session_file, state )
	{
		fs.write( session_file, JSON.stringify( state ), 'w' )
	}

	var load_state = function( session_file )
	{
		if( fs.isFile(session_file) )
		{
			console.log("resume " + session_file)
			return JSON.parse( fs.read(session_file) )
		}
	}

	this.filter = function( filter )
	{
		query += ' ' + filter
		return this
	}

	this.attack = function( out_file )
	{
		var session_file = ( ( site.trim() ) ? '__' + site.trim().replace(/[\.:\/]/g, '_') : '__state' ) + '.json'
		var dork, captcha = false
		dorks = load_state( session_file ) || dorks

		web_browser.onResourceReceived = function(resp) { if(! captcha) captcha = (resp.status == 403) }
		web_browser.onLoadFinished = function(status)
		{
			web_browser.render( ( ( site.trim() ) ? site.trim().replace(/\./g, '_') : 'page' ) + '.png' )
			if(! captcha)
				captcha = web_browser.evaluate( function() { if(document.getElementById('captcha')) return true } )

			if( /q=/.test(web_browser.url) && !captcha )
			{
				var result = web_browser.evaluateJavaScript(
					"function() {\n\
						var href_results = [], a = document.getElementsByTagName('a'), match\n\
						for( var i = 0; i < a.length; i++ )\n\
		  					if( /*a[i].getAttribute('target') == '_blank' &&*/ a[i].parentNode.tagName.toLowerCase() == 'h3' && a[i].getAttribute('href').indexOf('" + ( (site.trim()) ? site.trim().replace(/'/g, '') : '') + "') != -1 )\n\
		  					{\n\
		  						if( 0 /*( match = a[i].getAttribute('href').match(/q=(.*)/) ) && match.length == 2 && ( uri = match[1] )*/ )\n\
		  						{\n\
		  							console.log( '+ ' + uri )\n\
		    						href_results.push( uri )\n\
		    					}\n\
		    					else\n\
		    					{\n\
		    						console.log( '+ ' + a[i].getAttribute('href') )\n\
		    						href_results.push( a[i].getAttribute('href') )\n\
		    					}\n\
		    				}\n\
	    				return href_results\n\
					}"
				)
				if(result.length)
				{
					//web_browser.render( ( (site.trim()) ? site.trim().replace(/\./g, '_') : 'page' ) + '_' + (++found_pages) + '.png')
					if( out_file )
						fs.write( out_file, query + ' ' + dork + '\n', 'a' )
				}
			}

			save_state( session_file, dorks )

			if(captcha)
			{
				if( dorks.indexOf(dork) == -1 )
					dorks.splice( dorks.length, 0, dork )
				if( captcha_retry_timeout )	/* easy anti-captcha */
				{
					console.log("warn: captcha, sleeping " + captcha_retry_timeout + " ms")
					setTimeout( function() { 
						web_browser.open( uri, function(status) { console.log("reopen " + uri + " (another UserAgent)") } )
					}, captcha_retry_timeout )
					web_browser.settings.userAgent = userAgents[ parseInt( Math.random() * userAgents.length ) ]
				}
				else
				{
					var intr = setInterval( function() {
						if(! fs.isFile('captcha.png') )
						{
							web_browser.render('captcha.png')
							console.log('warn: enter chars from captcha.png')
						}
						if( captcha = system.stdin.readLine().trim() )
						{
							fs.remove('captcha.png')
							var error = web_browser.evaluateJavaScript(
								"function() {\n\
									var captcha = document.getElementById('captcha')\n\
									if(! captcha)\n\
										return 'captcha field not found'\n\
									captcha.value = '" + captcha.replace(/[\r\n]/g, '') + "'\n\
									node = captcha\n\
									while( node = node.parentNode )\n\
										if( node.tagName.toLowerCase() == 'form' || node.tagName.toLowerCase() == 'body' )\n\
				    						break\n\
				    				if( node.tagName.toLowerCase() != 'form')\n\
				    					return 'captcha form not found'\n\
				    			}"
							)
							web_browser.sendEvent('keypress', web_browser.event.key.Enter)
							captcha = false
							clearInterval(intr)
							if(error)
								console.log(error)
						}
						else
							console.log('warn: enter chars from captcha.png')
					}, 500 )
				}
			}
			else
			{
				if( dork = dorks.pop() )
				{
					console.log("dork: " + dork)
					var error = web_browser.evaluateJavaScript(
						"function() {\n\
							setTimeout( function() {\n\
								var search_query, inp = document.getElementsByTagName('input')\n\
								for(var i = 0; i<inp.length; i++)\n\
								{\n\
				  					if( inp[i].getAttribute('type') == 'text' || inp[i].getAttribute('type') == null )\n\
				  					{\n\
				  						search_query = inp[i]\n\
				  						break\n\
				  					}\n\
				  				}\n\
				  				if(! search_query)\n\
				  					return 'search query input not found'\n\
				  				search_query.value = '" + query.replace(/'/g, "\\'").replace(/\r/g, '') + " " + dork.replace(/'/g, "\\'").replace(/\r/g, '') + "'\n\
				  				node = search_query\n\
								while( node = node.parentNode )\n\
						  			if( node.tagName.toLowerCase() == 'form' || node.tagName.toLowerCase() == 'body' )\n\
				    					break\n\
				    			if(! node.tagName.toLowerCase() == 'form')\n\
				    				return 'search form not found'\n\
								node.submit()\n\
							}, " + timeout + ")\n\
						}"
					)
					if(error)
					{
						dorks.splice( dorks.length, 0, dork )
						console.log('err: ' + error)
					}
				}
				else
				{
					fs.remove( session_file )
					web_browser.__this.done = true
					exit()
				}
			}
		}

		web_browser.open( uri, function(status) {
			if(status != 'success')
				console.log( 'warn: ' + uri + ': ' + status)
		} )
		return this
	}
}

function GHDB()
{
	var web_browser = require('webpage').create()
	var uri = 'https://www.exploit-db.com/google-hacking-database/'
	var dorks = []
	var filename = ''
	this.done = false
	web_browser.viewportSize = { width: 1280, height: 800 }
	web_browser.__this = this

	web_browser.onConsoleMessage = function(msg)
	{
		console.log(msg)
	}

	this.save = function(result_filename)
	{
		filename = result_filename
		return this
	}

	this.file = function(source_filename)
	{
		if( fs.isFile( source_filename ) )
		{
			var custom_dorks = fs.read( source_filename ).split('\n')
			for( var i = 0; i < custom_dorks.length; i++ )
				if( dork = custom_dorks[i].replace(/\r/g, '') )
					dorks.push( dork )
		}
		if( filename )
			fs.write( filename, dorks.join('\n'), 'w' )
		this.done = true
		exit()
	}

	var get_onLoadFinished_handler = function( evaluate_code, query )
	{
		return function(status)
		{
			//web_browser.render('ghdb.png')
			if(query != null)
			{
				query = null
				if( error = web_browser.evaluateJavaScript(	evaluate_code ) )
					console.log(error)
			}
			else
			{
				var result = web_browser.evaluate( function() {
					var dork,dorks = [], a = document.getElementsByTagName('a')
					for( var i = 0; i < a.length; i++)
						if( /\/ghdb\//.test( a[i].getAttribute('href') ) )
						{
							dork = a[i].innerHTML
								.replace(/&amp;/g, '&').replace(/(&quot;|&ldquo;|&rdquo;)/g, '"')
								.replace(/&gt;/g, '>').replace(/&lt;/g, '<')
							dorks.push( dork )
							console.log( dork )
						}
					return dorks
				} )
				dorks = dorks.concat( result )

				var next_page = web_browser.evaluate( function() {
					var href_results = [], a = document.getElementsByTagName('a')
					for( var i = 0; i < a.length; i++)
						if( a[i].innerHTML.toLowerCase() == 'next' )
							return a[i].getAttribute('href')
				} )
				if( next_page )
					web_browser.open( next_page.replace(/\t/g, '') )
				else
				{
					if( filename )
						fs.write( filename, dorks.join('\n'), 'w' )
					web_browser.__this.done = true
					exit()
				}
			}
		}
	}

	this.categories = [
		'Any Category',
        'Footholds',
        'Files containing usernames',
        'Sensitive Directories',
        'Web Server Detection',
        'Vulnerable Files',
        'Vulnerable Servers',
        'Error Messages',
        'Files containing juicy info',
        'Files containing passwords',
        'Sensitive Online Shopping Info',
        'Network or vulnerability data',
        'Pages containing login portals',
        'Various Online Devices',
        'Advisories and Vulnerabilities'
	]

	this.print_categories = function()
	{
		console.log("categories:")
		this.categories.forEach( function(val,key) {
			console.log("[" + key + "] " + "'" + val + "'")
		} )
	}

	this.category = function(category)
	{
		var category_id
		if( parseInt(category) != NaN && String( parseInt(category) ).length == category.length )
			category_id = parseInt( category )
		else
			category_id = ( this.categories.indexOf(category) != -1 ) ? this.categories.indexOf(category) : ( function(categories, category) {
			for(var i=0; i < categories.length; i++)
				if( categories[i].toLowerCase().search( category.toLowerCase() ) != -1 )
					return i
		} )(this.categories, category)
		if( category_id == null )
		{
			console.log('category ' + category + ' not found')
			return this
		}

		web_browser.onLoadFinished = get_onLoadFinished_handler(
			"function() {\n\
				var select_element = document.getElementById('ghdb_search_cat_id')\n\
	  			if(! select_element)\n\
	  				return 'categories element not found'\n\
	  			select_element.value = '" + category_id + "'\n\
	  			node = select_element\n\
				while( node = node.parentNode )\n\
			  		if( node.tagName.toLowerCase() == 'form' || node.tagName.toLowerCase() == 'body' )\n\
	    				break\n\
	    		if(! node.tagName.toLowerCase() == 'form')\n\
	    			return 'search form not found'\n\
				node.submit()\n\
			}", category_id
		)

		web_browser.open( uri, function(status) {
			if(status != 'success')
				console.log( 'warn: ' + uri + ': ' + status)
		} )
		return this
	}

	this.search = function(query)
	{
		web_browser.onLoadFinished = get_onLoadFinished_handler(
			"function() {\n\
				var search_query, inp = document.getElementsByTagName('input')\n\
				for(var i = 0; i<inp.length; i++)\n\
				{\n\
	  				if( inp[i].getAttribute('type') == 'text' || inp[i].getAttribute('type') == null )\n\
	  				{\n\
	  					search_query = inp[i]\n\
	  					break\n\
	  				}\n\
	  			}\n\
	  			if(! search_query)\n\
	  				return 'search query input not found'\n\
	  			search_query.value = '" + query + "'\n\
	  			node = search_query\n\
				while( node = node.parentNode )\n\
			  		if( node.tagName.toLowerCase() == 'form' || node.tagName.toLowerCase() == 'body' )\n\
	    				break\n\
	    		if(! node.tagName.toLowerCase() == 'form')\n\
	    			return 'search form not found'\n\
				node.submit()\n\
			}", query
		)

		web_browser.open( uri, function(status) {
			if(status != 'success')
				console.log( 'warn: ' + uri + ': ' + status)
		} )
		return this
	}
}


function print_help( script_name )
{
	console.log( "\n\
USAGE: \n\
phantomjs " + script_name + " [command] [options]\n\
  commands: ghdb, google\n\
  options (ghdb):\n\
    -q [words]			query from exploit-db GHDB\n\
    -c [name or id]		category from exploit-db GHDB\n\
    -l				list exploit-db GHDB categories\n\
  options (google):\n\
    -d [dork]			specify google dork\n\
    -D [dork_file]		specify google dorks\n\
    -s [site]			set site name\n\
    -S [sites_file]		set sites filename\n\
    -f [filter]			set custom filter\n\
    -t [msec]			set timeout between query\n\
    -T [msec]			set captcha retry timeout\n\
  options common:\n\
    -o [result_file]		save data in file\n\
\n\
EXAMPLES:\n\
  phantomjs " + script_name + " ghdb -q oracle -o oracle_dorks.txt\n\
  phantomjs " + script_name + " ghdb -c \"vulnerable files\" -o vuln_files.txt\n\
  phantomjs " + script_name + " ghdb -c 0 -o all_dorks.txt\n\
\n\
  phantomjs " + script_name + " google -D all_dorks.txt -s \"somesite.com\" -o result.txt\n\
  phantomjs " + script_name + " google -d \"mysql running.on\" -S \"sites.txt\"\n\
  phantomjs " + script_name + " google -D vuln_files.txt -S \"sites.txt\" -o result.txt\n\
  phantomjs " + script_name + " google -D vuln_servers.txt -f \"inurl:com\" -f \"inurl:net\"\n\
	" )
}

function exit()
{
	for(var i = 0; i < pages.length; i++)
		if(! pages[i].done )
			return
	phantom.exit()
}

function remove_old_files()
{
	if( fs.isFile('captcha.png') )
		fs.remove('captcha.png')
}


var settings = {
	'words': '',
	'category': null,
	'print_categories': false,
	'dorks': [],
	'dork_file': 'dorks.json',
	'sites': [],
	'filters': [],
	'timeout': 0,
	'captcha_timeout': 0,
	'output': ''
}, command

if( system.args.length > 1 )
{
	command = system.args[1].toLowerCase()
	if( command != 'ghdb' && command != 'google' )
	{
		console.log("bad command")
		exit()
	}
	for( var i = 2; i < system.args.length; i++ )
	{
		switch( system.args[i] )
		{
			case '-q':
				settings.words = system.args[++i]
				break
			case '-c':
				settings.category = system.args[++i]
				break
			case '-l':
				settings.print_categories = true
				break
			case '-f':
				settings.filters[ settings.filters.length ] = system.args[++i]
				break
			case '-d':
				settings.dorks[ settings.dorks.length ] = system.args[++i]
				break
			case '-D':
				settings.dork_file = system.args[++i]
				break
			case '-s':
				settings.sites[ settings.sites.length ] = system.args[++i]
				break
			case '-S':
				var sites_file = system.args[++i]
				if( sites_file && fs.isFile(sites_file) )
					settings.sites = fs.read(sites_file).replace(/\r/g, '').split('\n')
				break
			case '-t':
				settings.timeout = system.args[++i]
				break
			case '-T':
				settings.captcha_timeout = system.args[++i]
				break
			case '-o':
				settings.output = system.args[++i]
				break
			default:
				console.log('unknown option')
				print_help()
				exit()
		}
	}

	if( settings.print_categories )
	{
		new GHDB().print_categories()
		exit()
	}
	else
	{
		switch( command )
		{
			case 'ghdb':
				if( settings.category )
					pages.push( new GHDB().category( settings.category ).save( settings.output ) )
				else
					pages.push( new GHDB().search( settings.words ).save( settings.output ) )
				break
			case 'google':
				remove_old_files()
				if( settings.filters && settings.sites.length == 0 )
					settings.sites.push(" ")
				for(var i = 0; i < settings.sites.length; i++)
					if( settings.sites[i] )
						pages.push(
							new Google( settings.sites[i] )
								.filter( settings.filters.join(' ') )
								.set_dorks( settings.dork_file )
								.set_dork( settings.dorks )
								.set_timeout( settings.timeout )
								.set_captcha_retry_timeout( settings.captcha_timeout )
								.attack( settings.output )
						)
				break
		}
	}
}
else
{
	print_help( system.args[0] )
	exit()
}
