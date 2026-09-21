# HTTPS 배포 가이드 (Nginx + Let's Encrypt)

`server.cjs`는 이제 내부 전용(`127.0.0.1:3000`)으로만 동작합니다. 외부 요청은
Nginx가 80/443 포트에서 받아 SSL을 처리한 뒤 Express로 프록시합니다.

## 사전 조건

- 실제 서버(리눅스 VPS 등)에 대한 SSH 접근
- 도메인의 DNS A 레코드가 해당 서버의 공인 IP를 가리키고 있어야 함
- 서버 방화벽에서 80, 443 포트 오픈

## 1. Express 앱 실행 (내부 포트 3000)

```sh
npm install
npm run build
npm start   # server.cjs가 127.0.0.1:3000에서 대기
```

재부팅 후에도 계속 떠 있도록 pm2 또는 systemd로 등록하는 것을 권장합니다.

```sh
npm install -g pm2
pm2 start server.cjs --name scopage
pm2 save
pm2 startup
```

## 2. Nginx 설치 및 설정

```sh
sudo apt update
sudo apt install nginx

sudo cp deploy/nginx.conf /etc/nginx/sites-available/scopage
sudo ln -s /etc/nginx/sites-available/scopage /etc/nginx/sites-enabled/
```

```sh
sudo nginx -t
sudo systemctl reload nginx
```

이 시점에 `http://your-domain`으로 접속되면 Express 앱이 정상적으로 프록시되는지 확인합니다.

## 3. Let's Encrypt 인증서 발급 (certbot)

```sh
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seogwipochamber.org -d www.seogwipochamber.org
```

certbot이 자동으로:
- 443 포트용 SSL 서버 블록 추가
- 인증서 경로(`/etc/letsencrypt/live/seogwipochamber.org/`) 설정
- HTTP → HTTPS 리다이렉트 추가

를 해줍니다. 프롬프트에서 "Redirect HTTP to HTTPS"를 선택하세요.

인증서는 90일마다 만료되며, certbot이 설치하는 systemd timer(`certbot.timer`)가
자동으로 갱신합니다. 확인은 다음으로:

```sh
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

## 4. 확인

```sh
curl -I https://seogwipochamber.org
```

`HTTP/2 200`과 함께 응답이 오면 HTTPS 적용이 완료된 것입니다.
