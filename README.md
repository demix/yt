# yt

``` shell
yarn
# npm install

node dist/index.js
```

## Nginx

```
server {
    listen 80;
    server_name w1.yt1024.com ;

    location / {
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Protocol "http:";
        proxy_pass http://127.0.0.1:8006;
    }
}

server {
       listen 443 ssl;
       server_name w1.yt1024.com ;

       ssl_certificate /etc/letsencrypt/live/w1.yt1024.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/w1.yt1024.com/privkey.pem;

       location / {
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-Protocol "https:";
           proxy_pass   http://127.0.0.1:8006;
       }
}
```
