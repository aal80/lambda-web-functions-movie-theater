# AWS Lambda Web Functions Movie Theater

![](./header.png)

A small demo of [AWS Lambda Web Functions](https://docs.aws.amazon.com/lambda/latest/dg/web-functions.html) and **response streaming**. It plays ASCII-art movies frame by frame over a single long-lived HTTP response, in a browser or straight in your terminal.

The server is a plain [Express](https://expressjs.com/) 5 app. It listens on a port like any Node.js web server, and Lambda Web Functions runs it as is.

## Run locally

Requires Node.js 24 or later and nodemon. 

```sh
make dev
```

Then open http://localhost:3000, or run:

```sh
curl -N http://localhost:3000/starwars
```

Lambda sets `AWS_LAMBDA_HTTP_ENDPOINT` to the `host:port` the server must listen on. Locally the server falls back to `127.0.0.1:3000`.

Use a terminal at least 67 columns by 14 rows. A smaller window scrolls the frames instead of redrawing them in place.

## Deploy to AWS

Requirements:

- AWS CLI v2 with the `lambda-web` commands. If `aws lambda-web help` fails, update the CLI.
- Credentials and a region where Lambda Web Functions is available. At launch these are `us-east-1`, `us-east-2`, `us-west-2`, `eu-west-1`, and `ap-northeast-1`.

```sh
make deploy    # install production deps, deploy, and print the URLs
make urls      # print the browser URL and curl commands again
make destroy   # delete the Web Function, including its revisions and endpoints
```

`make deploy` runs `aws lambda-web deploy`, which packages `src/` and uploads it to a CLI-managed S3 bucket. It then creates the Web Function `lwf-movie-theater`, an execution role, and a `dev` endpoint. Running it again publishes a new revision, and the endpoint switches to it automatically.


## Credits

- The Star Wars ASCII animation is from [asciimation.co.nz](https://www.asciimation.co.nz/).
- The AWS Lambda logo comes from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Amazon_Lambda_architecture_logo.svg). It is a trademark of Amazon.com, Inc.
- The poster images on the landing page are linked from third-party sites, not stored in this repo.

## License

[MIT](LICENSE)
