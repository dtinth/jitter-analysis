# A tool to gather jitter information

Cloud servers vary in their network quality and performance. When jamming music online with [Jamulus](https://jamulus.io/) or other real-time audio software, it is important to choose a provider that has the least amount of jitter.

This is done by having all servers send pings and pongs to each other via UDP, and recording the time between the pings and pongs. The results are then retrieved for further analysis.

| Configuration | Value |
| --- | --- |
| Ping rate | 100 pings per second |
| Ping timeout | 1 second |
| UDP payload size | ~40 bytes |

## Requirements

* Every server you want to test must be running at the same time and can connect to each other.

## Usage

1. Run `yarn` to install dependencies.

2. Run `yarn build` to build `pinger.js` into a static binary `./pinger`.

3. Copy `./pinger` to the servers you want to test. The `plays/upload-pinger.yml` playbook will upload the binary to `/opt/jitter-analysis/pinger` as root.

4. Create a list of `name=ip` pairs and put them on the same line. For example,

    ```
    server1=<ip> server2=<ip> server3=<ip>
    ```

5. Run this command on all the servers at the same time as root:

    ```sh
    nice -n -19 /opt/jitter-analysis/pinger server1=<ip> server2=<ip> server3=<ip> \
      | tee -a /opt/jitter-analysis/ping.log
    ```

    This will periodically generate output that looks like this (on one line).

    Here is the output from `server1`:

    ```yaml
    {
      "server1": {"received":{"0":1491},"lost":0},
      "server2": {"received":{"1":330,"2":319,"3":97,"4":73,"5":76,"6":65,"7":75,"8":86,"9":83,"10":108,"11":94,"12":50,"13":32,"14":2,"15":2},"lost":0},
      "server3": {"received":{"0":929,"1":522,"2":22,"3":11,"5":3,"6":1,"7":3,"9":1},"lost":0}
    }
    ```

    * `server1` has no jitter at all, but that’s because it is ping-ponging with itself.
    * `server2` has the most amount of jitter.

    However, we cannot conclude yet, because we are only looking at the result from `server1`.
    Maybe `server1` itself has high jitter and that the affects the ping time of every other server.
    Maybe `server1` and `server2` just aren’t getting along well.
    We can’t know for sure, until we look at the results from all servers combined.

6. Download the results from all servers. The `plays/download-results.yml` playbook will download the results to `private/results/` folder.

7. Analyze the result. Some rudimentary analysis script is available at [result-analyzer.js](result-analyzer.js).
