# Battlescripts

A simple bot-vs-bot Battleships webgame.

## Instructions

Please make sure that the latest version of Node.js, Foreman, MongoDB and Redis are installed in your system. MongoDB and Redis should be running before you start the Node.js application.

- Clone the repository

        $ git clone https://github.com/hjr265/battlescripts.git

- Install dependencies via NPM

        $ cd battlescripts
        $ npm install

- Create a ".env" file by copying "env-sample.txt", and populate it

        SECRET: A fairly long random string, e.g. a-fairly-long-random-string
        BASE: Base URL where the application will be available, e.g. http://localhost:5000
        MONGO_URL: MongoDB URL for the database, e.g. mongodb://localhost/battlescripts
        FACEBOOK_APP_ID: Create a Facebook application from your developer console, and put the App ID here
        FACEBOOK_APP_SECRET: .. and App Secret here
        TWITTER_CONSUMER_KEY: .. similarly, do it for Twitter
        TWITTER_CONSUMER_SECRET
        GOOGLE_CLIENT_ID: .. and Google
        GOOGLE_CLIENT_SECRET
        OPT_MAX_BOTS_PER_USER: Set to "16", without quotes
        OPT_MAX_TESTS_PER_HOUR: Set to "128"
        OPT_MAX_TESTS_CONCURRENCY: Set to "2"
        OPT_MAX_SAVES_PER_HOUR: Set to "1024"
        OPT_MAX_CHALLENGES_PER_HOUR: Set to "32"
        POSTMARK_API_KEY: Required for sending emails
        SENTRY_URL: Required for tracking in-application errors
        OPT_ENGINE_GC_EVERY_STEP: Set to "no"
        OPT_GAMES: Comma separated list of game engines to enable, e.g. Battlescripts,Tictactoe or just Battlescripts

- Use Foreman to start a "web" process, and at least one "kue" process in loop (separately)

        $ foreman start web
        $ while true; do foreman start kue; sleep 1; done

- Navigate to [http://localhost:5000](http://localhost:5000) on your web browser

## Documentation

- [Toptal Article](http://www.toptal.com/nodejs/introducing-battlescripts-bots-ships-mayhem)

## Contributing

Contributions are welcome.

## License

Battlescripts is available under the [BSD (3-Clause) License](http://opensource.org/licenses/BSD-3-Clause).
