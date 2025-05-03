# longJohn
Node.JS/React Media Server

Requirements:
- NPM
- Postgres

Web based media server that can be run on a raspberry pi or windows box. Uses Node.js.
Movies will stream via the web to app to any browser. No need to install a phone app or tv app.
Simply go to the ip address of the pi in a browser and watch.
There is NO SECURITY (Login or API key) so this project should only be used on a 
Secure Private Network.

Supports

- Mp4 movies
- Vtt subtitles
- Multi nested folders for Audio Books
- Metadata is added to all movies via OIMDB API look UP and Google Books

Indexes all files and saves them to a postgres database

# Setting up the Server

- Install Node 18 or greater
- Install Postgres 
- Install PG Admin

Server Config
- Copy longjohn directory to Documents directory
- Open server/util/config.js
- Create a Postgres database Using PG Admin
- Update the Database connection details in config.js to match
- Set your Google Books API Key You will NOT use OAuth. ```https://developers.google.com/books/docs/v1/using```
- Set your omdbApiKey ```https://www.omdbapi.com/```
- Set the paths to your media. If you are running linux you will need to change file permissions on your media and directories. ```chmod -R 0755 /media```
- Consider Creating an entry in the cron tab to run server.js on startup

Update Database (You need to run database update once.)
- Open Documents/longjohn
- run ```npm install```
- run ```npm run updateDB```
- connect to database using PGAdmin make sure tables have been created correctly

Start Server 
- Open Documents/longjohn
- run ```npm install```
- run ```npm start```

# Setting Up the Web App Express Static Server
Using express-static is an easier alternative to Nginx. The server already installed express-static.

- Goto app directory
- Open app/package.json
- Set BASE_HOST to internal IP address of your server in package.json script
- Edit app/client.js and configure express-static
- run ```npm install```
- run ```npm run build```
- run ```"node ./app/client.js"```
- Open browser goto local host and see if web app runs! Check Console for Errors!
- You can use ```npm start``` instead to develop using webpack dev server

# Setting up LongJohn on a server
- Create LongJohn directory on server
- Copy all files from Server to directory
- Copy "public" folder and everything in it (index.html and bundle.js) to the app directory
- Copy client.js to app directory
- You do not need to copy src or node_modules to your server

- Consider Creating an entry in the cron tab to run client.js and server.js on startup

# Setting Up the Web App Nginx (Optional)
If you plan to host the app in Nginx you will need to install Nginx

- Open app/package.json
- Set BASE_HOST to internal IP address of your server
- run ```npm install```
- run ```npm run build```
- Copy "public" folder and everything in it to your Nginx sites-available