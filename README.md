# longjohn
nodejs/angular media server

Requirements:
- NPM
- Postgres

Web based media server that can be ran on a raspberry pi or windows box. Uses Node JS. Movies will stream via the web to app to any browser. No need to install a phone app or tv app
Simply go to the ip address of the pi in a browser and watch.

Supports
-Mp4 movies
-Vtt subtitles
-Mp3 streams for Music or Audio Books
-Multi nested folders for Audio Books
-Meta data is added to all movies via OIMDB API look UP

Indexes all files and saves them to a postgress database
