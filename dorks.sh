PATH="$PATH":.
#phantomjs --proxy=socks5://127.0.0.1:9050 --proxy-type=socks5 dorks.js $*
#phantomjs --proxy=http://127.0.0.1:8080 dorks.js $*
phantomjs dorks.js $*