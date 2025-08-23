#!/usr/bin/env node
const http = require("http");
const { exec } = require("child_process");
const PORT = process.env.PORT || 3001;
const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/deploy") {
    console.log("Deployment webhook received");
    exec("git pull origin master && yarn install && yarn build", (error, stdout) => {
      if (error) {
        res.writeHead(500);
        res.end("Deployment failed");
        return;
      }
      res.writeHead(200);
      res.end("Deployment successful");
    });
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(PORT, () => console.log(\`Webhook server on port \${PORT}\`));
