# dorks
google hack database automation tool

USAGE:
phantomjs dorks.js [command] [options]
  commands: ghdb, google
  options (ghdb):
    -q [words]                  query from exploit-db GHDB
    -c [name or id]             category from exploit-db GHDB
    -l                          list exploit-db GHDB categories
  options (google):
    -d [dork]                   specify google dork
    -D [dork_file]              specify google dorks
    -s [site]                   set site name
    -S [sites_file]             set sites filename
    -f [filter]                 set custom filter
    -t [msec]                   set timeout between query
    -T [msec]                   set captcha retry timeout
  options common:
    -o [result_file]            save data in file

EXAMPLES:
  phantomjs dorks.js ghdb -q oracle -o oracle_dorks.txt
  phantomjs dorks.js ghdb -c "vulnerable files" -o vuln_files.txt
  phantomjs dorks.js ghdb -c 0 -o all_dorks.txt

  phantomjs dorks.js google -D all_dorks.txt -s "somesite.com" -o result.txt
  phantomjs dorks.js google -d "mysql running.on" -S "sites.txt"
  phantomjs dorks.js google -D vuln_files.txt -S "sites.txt" -o result.txt
  phantomjs dorks.js google -D vuln_servers.txt -f "inurl:com" -f "inurl:net"

REQUIRE: phantomjs
