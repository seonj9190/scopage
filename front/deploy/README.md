# HTTPS 배포 가이드 (Nginx + Let's Encrypt)

`server.cjs`는 이제 내부 전용(`127.0.0.1:3000`)으로만 동작합니다. 외부 요청은
Nginx가 80/443 포트에서 받아 SSL을 처리한 뒤 Express로 프록시합니다.

## 사전 조건

- Rocky Linux 서버에 대한 SSH 접근 (root 또는 sudo 권한)
- 도메인의 DNS A 레코드가 해당 서버의 공인 IP를 가리키고 있어야 함
- firewalld에서 80, 443 포트(http/https 서비스) 오픈

## 1. MariaDB(MySQL) 설치 및 데이터베이스 생성

단원 캘린더의 멤버·일정 데이터는 MySQL 호환 데이터베이스에 저장됩니다.
Rocky Linux는 기본 저장소에 MariaDB(MySQL 호환)가 포함되어 있습니다.

```sh
sudo dnf install -y mariadb-server
sudo systemctl enable --now mariadb
sudo mysql_secure_installation
```

데이터베이스와 전용 계정을 만듭니다.

```sh
sudo mysql -u root -p
```

```sql
CREATE DATABASE scopage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'scopage'@'localhost' IDENTIFIED BY '강력한-비밀번호로-변경';
GRANT ALL PRIVILEGES ON scopage.* TO 'scopage'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

`front/.env.local.example`을 복사해 `front/.env.local`을 만들고 위에서 정한 값을
채웁니다(`.env.local`은 git에 커밋되지 않음).

```sh
cp .env.local.example .env.local
```

테이블(`members`, `schedules`)은 서버가 처음 시작될 때 자동으로 생성되므로
별도의 마이그레이션 명령은 필요 없습니다.

## 2. Express 앱 실행 (내부 포트 3000)

```sh
npm install
npm run build
npm start   # server.cjs가 127.0.0.1:3000에서 대기
```

### 단원 캘린더 최초 관리자 계정 생성

회원가입 화면이 없으므로, 서버에서 최초 1회 아래 명령으로 관리자 계정을 만듭니다.
이후 로그인(`/login`, 메인 메뉴에는 노출되지 않는 숨겨진 주소)해서 "멤버 관리"
화면(`/admin/members`)으로 나머지 단원 계정을 추가하면 됩니다.

```sh
node server/seed.js <아이디> <비밀번호> <이름>
```

로그인 서명에 쓰이는 비밀키는 `data/.jwt_secret`에 자동 생성되어 저장됩니다
(git에는 커밋되지 않음). 서버를 새 장비로 옮길 때는 MariaDB 데이터(멤버·일정)와
`data/` 폴더를 함께 백업·복원해야 기존 로그인 세션과 계정이 유지됩니다. MariaDB
백업은 `mysqldump scopage > backup.sql`로 받을 수 있습니다.

재부팅 후에도 계속 떠 있도록 pm2 또는 systemd로 등록하는 것을 권장합니다.

```sh
npm install -g pm2
pm2 start server.cjs --name scopage
pm2 save
pm2 startup
```

## 3. Nginx 설치 및 설정

```sh
sudo dnf install -y nginx
sudo systemctl enable --now nginx
```

Rocky(RHEL 계열)는 Ubuntu와 달리 `sites-available`/`sites-enabled` 구조가 아니라
`/etc/nginx/conf.d/*.conf`를 자동으로 읽어들입니다. 설정 파일을 그 경로에 넣습니다.

```sh
sudo cp deploy/nginx.conf /etc/nginx/conf.d/scopage.conf
```

방화벽(firewalld)에서 http/https 포트를 열어줍니다. `FirewallD is not running` 오류가
나면 서비스 자체가 꺼져 있는 것이므로 먼저 켜줍니다.

```sh
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-service=http --add-service=https
sudo firewall-cmd --reload
```

클라우드(AWS/GCP/네이버클라우드 등) 서버라면 firewalld와 별개로 보안 그룹/네트워크
ACL에서도 80, 443 인바운드를 열어줘야 외부에서 접속됩니다. 만약 이 서버가 firewalld
대신 클라우드 보안 그룹만으로 방화벽을 관리하는 구성이라면, firewalld는 설치되어
있지 않거나 의도적으로 꺼져 있을 수 있으니 이 단계는 건너뛰고 보안 그룹만 확인하면
됩니다.

SELinux가 Enforcing 모드면 Nginx가 백엔드(3000번 포트)로 프록시 연결하는 것을
기본적으로 막습니다. 아래 설정으로 허용해줘야 합니다.

```sh
sudo setsebool -P httpd_can_network_connect 1
```

```sh
sudo nginx -t
sudo systemctl reload nginx
```

이 시점에 `http://seogwipochamber.org`로 접속되면 Express 앱이 정상적으로 프록시되는지 확인합니다.

## 4. Let's Encrypt 인증서 발급 (certbot)

Rocky Linux는 certbot이 기본 저장소에 없으므로 EPEL을 먼저 설치합니다.

```sh
sudo dnf install -y epel-release
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seogwipochamber.org -d www.seogwipochamber.org
```

certbot이 자동으로:
- 443 포트용 SSL 서버 블록 추가
- 인증서 경로(`/etc/letsencrypt/live/seogwipochamber.org/`) 설정
- HTTP → HTTPS 리다이렉트 추가

를 해줍니다. 프롬프트에서 "Redirect HTTP to HTTPS"를 선택하세요.

인증서는 90일마다 만료됩니다. EPEL의 certbot 패키지는 보통 자동 갱신용 타이머를
함께 설치하는데, 이름이 배포판에 따라 다를 수 있으니 아래로 확인하세요.

```sh
sudo systemctl list-timers | grep certbot
sudo certbot renew --dry-run
```

타이머가 보이지 않으면 직접 등록합니다.

```sh
echo "0 3 * * * root certbot renew --quiet --deploy-hook 'systemctl reload nginx'" \
  | sudo tee /etc/cron.d/certbot-renew
```

## 5. 확인

```sh
curl -I https://seogwipochamber.org
```

`HTTP/2 200`과 함께 응답이 오면 HTTPS 적용이 완료된 것입니다.
