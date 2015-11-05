# Udraw Redis Keyspace

## Analytic Variables

```
putcount
getcount
totalconnections
currentconnections
```

#### Tile hashmap

Key | Field | Description
--- | --- | ---
tile:name:zoom:x:y | `data` | **image binary data**
tile:name:zoom:x:y | `lastupdate` | **unix timestamp of last saved**
tile:name:zoom:x:y | `lastuser` | **last user or ip to save tile**
tile:name:zoom:x:y | `protection` | **0 if not protected or rating 1-10 for protected tile**

#### User hashmap

Key | Field | Description
--- | --- | ---
user:ip | `lastconnect` | **unix timestamp of last websocket connect**
user:ip | `connectcount` | **Times user has connected**
user:ip | `lastuser` | **last user or ip to save tile**
user:ip | `distancedrawn` | **How far the user has drawn in pixels** *unused*
user:ip | `putcount` | **Total put requests from user**
user:ip | `getcount` | **Total tile get requests from user**

