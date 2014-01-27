var awssum          = require('awssum'),
    amazon          = awssum.load('amazon/amazon'),
    Route53         = awssum.load('amazon/route53').Route53,
    _               = require('underscore'),
    async           = require('async'),
    fmt             = require('fmt'),
    utils           = require('./lib/utils'),
    growl           = require('growl'),
    request         = require('request'),
    env             = process.env,
    lastKnownIP, hostedZones, opts, r53;

function searchRecord(ip) {
  r53.ListHostedZones(function(err, data) {
    if (err) {
      if (opts.debug) {
        utils.debugBlock('Error while listing hosted zones', err);
      }
      return;
    }

    hostedZones = data.Body.ListHostedZonesResponse.HostedZones.HostedZone;

    // dirty little hack for next map function
    if (!utils.isArray(hostedZones)) { hostedZones = [hostedZones]; }

    hostedZones = _.map(hostedZones, function(zone) {
      return {
        id   : zone.Id.replace('/hostedzone/', ''),
        name : zone.Name.slice(0, zone.Name.length - 1)
      };
    });

    if (opts.debug) {
      utils.debugBlock('Hosted Zones', hostedZones);
    }

    async.map(hostedZones, function(zone, callback) {
      r53.ListResourceRecordSets({ HostedZoneId : zone.id }, function(err, data) {
        var resp, records;

        if (err) { return callback(err); }

        records = data.Body.ListResourceRecordSetsResponse.ResourceRecordSets.ResourceRecordSet;
        records = _.filter(records, function(record) {
          return record.Type === 'A';
        });
	records.forEach(function(record, index, records){
		records[index].Name = record.Name.replace(/\\052/g, '*');
	});

        resp = {
          id      : zone.id,
          records : records
        };

        callback(null, resp);
      });
    }, function(err, zones) {
      if (err) {
        if (opts.debug) {
          utils.debugBlock('Error listing resource record sets', err);
        }
        return;
      }

      if (opts.debug) {
        utils.debugBlock('Zones with A records', zones);
      }

      (function iterate(iterator) {
        var zone, i, len, record, rootZone;

        zone = zones[iterator];

        // current zone has A type records, iterate through them until
        // domain is found
        if (zone.records.length) {
          // TODO: make simple forEach async
          for (i = 0, len = zone.records.length; i < len; i++) {
            if (zone.records[i].Name === (opts.domain + '.')) {
              return updateDns(ip, {
                zoneId : zone.id,
                record : zone.records[i]
              });
            }
          }
        }

        // proceed to next zone from the array
        if (iterator) {
          process.nextTick(function() {
            iterate(--iterator);
          });
        } else {
          if (opts.debug) {
            utils.debugBlock("Record doesn't exist, create it", hostedZones);
          }
          // no such record was found, iterate through hostedZones
          // and check for the root domain

          hostedZones.forEach(function(zone) {
            if (opts.domain.indexOf(zone.name) > -1) {
              rootZone = zone;
            }
          });

          return updateDns(ip, {
            zoneId : rootZone.id
          });
        }
      }(zones.length - 1));
    });

  });
}

function updateDns(ip, details) {
  var args, oldIps;

  if (opts.debug) {
    utils.debugBlock('updateDns() called', {
      ip      : ip,
      details : details
    });
  }

  args = {
    HostedZoneId: '/' + details.zoneId,
    Comment: 'Updated local ip at: ' + Date.now()
  };

  // if record already exists in Route53 - delete & re-create it
  if (details.record) {
    oldIps = details.record.ResourceRecords.ResourceRecord;
    // dirty little hack for next map function
    if (!utils.isArray(oldIps)) { oldIps = [oldIps]; }
    oldIps = _.map(oldIps, function(ip) {
      return ip.Value;
    });

    // IP still the same, no change needed
    if (oldIps.length === 1 && oldIps[0] === ip) {
      lastKnownIP = ip;

      if (opts.debug) {
        utils.debugBlock('Ip unchanged', 'No request sent!')
      }

      return;
    }

    args.Changes = [
      {
        Action          : 'DELETE',
        Name            : opts.domain,
        Type            : 'A',
        Ttl             : details.record.TTL,
        ResourceRecords : oldIps
      },
      {
        Action          : 'CREATE',
        Name            : opts.domain,
        Type            : 'A',
        Ttl             : opts.ttl,
        ResourceRecords : [ip]
      }
    ];
  } else {
    // record doesn't exist in Route53, create it
    args.Changes = [
      {
        Action          : 'CREATE',
        Name            : opts.domain,
        Type            : 'A',
        Ttl             : opts.ttl,
        ResourceRecords : [ip]
      }
    ];
  }

  if (opts.debug) {
    utils.debugBlock('Sent ip change request to Route53', args);
  }

  r53.ChangeResourceRecordSets(args, function(err, data) {
    if (err) {
      if (opts.debug) {
        utils.debugBlock('Error while updating ip in Route53', err);
      }
      return;
    }

    if (opts.debug) {
      utils.debugBlock('ChangeResourceRecordSetsResponse', data);
    }

    if (!err && data &&
      ((data.Body.ChangeResourceRecordSetsResponse.ChangeInfo.Status === 'PENDING') ||
      (data.Body.ChangeResourceRecordSetsResponse.ChangeInfo.Status === 'CREATE'))) {

      if (opts.debug && opts.growl) {
        utils.debugBlock('IP change successful', 'Sending growl notification');
      }

      if (opts.growl) {
        growl(opts.domain + ' : ' + ip, { title: 'Dynamic DNS Update' });
      }

      lastKnownIP = ip;
    }
  });
};

function checkIpUpdate(credentials, configs) {
  opts = configs;

  // initialize once
  r53 = r53 || new Route53(credentials);

  request(opts.ipserver, function (error, response, body) {
    var ip;

    if (!error && response.statusCode == 200) {
      try {
        ip = JSON.parse(body.trim()).ip;

        if (opts.debug) {
          utils.debugBlock('Your IP', ip);
        }

        // no point in querying Route53 if we know the last ip is correct right?
        if (ip !== lastKnownIP) {
          searchRecord(ip);
        } else {
          if (opts.debug) {
            utils.debugBlock('IP the same as last time', 'No update needed');
          }
        }
      }
      catch(err) {
        if (opts.debug) {
          utils.debugBlock('Error getting ip from server', err);
        }
      }
    } else {
      if (opts.debug) {
        utils.debugBlock('Error getting ip from server', error, response.statusCode);
      }
    }
  });
};

module.exports = checkIpUpdate;
