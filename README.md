      __                                        __
     /\ \                                      /\ \__
     \_\ \  __  __    ___   _ __   ___   __  __\ \ ,_\    __
     /'_` \/\ \/\ \ /' _ `\/\`'__\/ __`\/\ \/\ \\ \ \/  /'__`\
    /\ \L\ \ \ \_\ \/\ \/\ \ \ \//\ \L\ \ \ \_\ \\ \ \_/\  __/
    \ \___,_\/`____ \ \_\ \_\ \_\\ \____/\ \____/ \ \__\ \____\
     \/__,_ /`/___/> \/_/\/_/\/_/ \/___/  \/___/   \/__/\/____/
                /\___/
                \/__/

  Node.js command line tool for dynamically updating your domain's dns to your current ip using [Amazon Route53](http://aws.amazon.com/route53/).

```bash
dynroute -h

Usage: dynroute [options]

Options:
   -d, --domain          Domain to update [required]
   -ttl, --ttl           Time To Leave (in seconds) [default: 60]
   -t, --time            How frequently to check for IP update [default: 60]
   -o, --once            Check for IP update ONLY ONCE and exit [default: false]
   -g, --growl           Display growl notification after IP update [default: false]
   -aws, --awskeys       The path for the config file containing AWS credentials [default ~/.awsrc]
   -ipserv, --ipserver   Resp: { ip: "YOUR_IP_HERE" } [default http://whatismyip.nodejitsu.com/index.json]
   -dbg, --debug         Print debugging info
   -v, --version         Print version and exit
```

## Installation

    $ npm install -g dynroute

## Usage

  - Create a hosted zone for your domain in Route53, in case you don't already have one.
  - Update your domain's nameservers with the ones provided by Route53 (for that hosted zone).
  - Put your credentials into a config file such as ~/.awsrc (used by default)

```
[credentials]
accessKeyId     = AAAAAAAAAAAAAAAAAAAA
secretAccessKey = bbbbbbbbbbbbbbbbbbbbbLwccccembeMdddddI4e
```

### Update now & exit

```bash
dynroute -d home.mydomain.com --once
```

### Leave script open to check for updated every X seconds

```bash
dynroute -d home.mydomain.com
```

By default the script will check every 60 seconds if your ip updated, but you can customize that:

```bash
dynroute -d home.mydomain.com --time 120
```

## License

>(The MIT License)
>
>Copyright (c) 2012 Alexandru Vl&#259;du&#355;u &lt;alexandru.vladutu@gmail.com&gt;
>
>Permission is hereby granted, free of charge, to any person obtaining
>a copy of this software and associated documentation files (the
>'Software'), to deal in the Software without restriction, including
>without limitation the rights to use, copy, modify, merge, publish,
>distribute, sublicense, and/or sell copies of the Software, and to
>permit persons to whom the Software is furnished to do so, subject to
>the following conditions:
>
>The above copyright notice and this permission notice shall be
>included in all copies or substantial portions of the Software.
>
>THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
>EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
>MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
>IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
>CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
>TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
>SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
