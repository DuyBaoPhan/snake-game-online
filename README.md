# SNAKE ARENA

Modern neon Snake arcade, chạy local trên desktop và mobile. Bản local dùng demo; tích hợp API Vercel + Supabase tùy chọn cho bảng xếp hạng khách online. Xem phần thiết lập online bên dưới. Không có đăng nhập tài khoản.

## Cài đặt và chạy

Yêu cầu Node.js **22.12+** (hoặc 20.19+) và npm.

```bash
npm install
npm run dev
```

Mở URL mà Vite in trong terminal (mặc định http://localhost:5173). Để thử trên điện thoại cùng Wi-Fi, truy cập địa chỉ IP LAN của máy tính với cổng 5173; firewall cần cho phép kết nối. Không mở HTML bằng file:// vì dự án dùng ES modules.

```bash
npm run build       # Tạo bản production trong dist/
npm run preview     # Xem thử bản build
npm test            # Unit tests bằng Node.js, không cần trình duyệt
npx playwright install chromium
npm run test:e2e    # Kiểm thử Chromium; tự khởi động Vite
```

Google Fonts là phần trang trí tùy chọn. Khi không có Internet, game vẫn hoạt động với font hệ thống thay thế.

## Điều khiển

- **Arrow / WASD:** chuyển hướng; không được quay ngược 180°.
- **Space / Escape:** pause / resume.
- **R:** bắt đầu lại ngay lập tức.
- **Mobile:** vuốt trên bảng hoặc nhấn D-pad. Các nút pause/restart vẫn dùng được.
- Khi mất focus hoặc ẩn tab, game tự pause; resume thủ công để tránh chết ngoài ý muốn.
- Nút âm thanh và hướng dẫn nằm trên header. Mở hướng dẫn khi chơi sẽ pause game.

## Luật chơi

Bản đồ cố định 24 × 24 ô, responsive chỉ thay đổi kích thước render, không thay đổi luật chơi. Rắn bắt đầu với 3 đốt, 7 ô/giây. Mỗi thức ăn tăng 10 điểm và 1 đốt. Mỗi 50 điểm tăng 1 cấp và 1.2 ô/giây, tối đa 18 ô/giây. Va tường hoặc thân là thua. Di chuyển vào ô đuôi đang rời đi là hợp lệ nếu không tăng trưởng. Lấp đầy bảng là thắng.

## Kiến trúc

```text
src/
  main.js                 Tích hợp UI, input, một requestAnimationFrame duy nhất
  style.css               Dark/neon theme, responsive, reduced-motion
  game/
    engine.js             Fixed timestep, lifecycle, điều phối gameplay
    snake.js              Direction controller và hàng đợi tối đa 2 lệnh
    food.js               Random trên ô trống; xử lý full board
    collision.js          Va chạm tường/thân
    state.js              Trạng thái và quy tắc score/level/speed
  services/
    storage.js            LocalStorage với fallback khi bị chặn hoặc dữ liệu hỏng
    audio.js              Web Audio tạo âm ăn và va chạm/game over
    leaderboard.js        Async service: dữ liệu demo, điểm local
  ui/
    components.js         HTML UI và SVG icons
    BoardRenderer.js      Canvas HiDPI, nội suy, hạt sáng
public/favicon.svg        Icon ứng dụng
tests/game.test.js        Unit tests
e2e/arena.spec.js          Browser tests desktop/mobile/storage denied
playwright.config.js      Cấu hình browser test
```

### Mở rộng API sau này

UI gọi service leaderboard bất đồng bộ, không phụ thuộc nguồn dữ liệu. Thay phần triển khai service bằng HTTP API ở giai đoạn tiếp theo và giữ contract entries (name, score, rank…). Hiện leaderboard có nhãn **DEMO**, ghi rõ không phải online; điểm cá nhân chỉ thuộc thiết bị/trình duyệt hiện tại. Không có request gửi điểm lên server. Không dùng điểm local làm nguồn tin cậy cho giải đấu thật: backend tương lai cần xác minh điểm và kiểm soát gian lận.

### Đảm bảo chất lượng

Engine độc lập DOM để test bằng Node. Không tạo timer trong start/restart, chỉ một animation loop trong app. Input có hàng đợi giới hạn và chặn quay ngược theo hướng đã queue. Food chỉ chọn ô trống; không có vòng random vô hạn khi gần đầy bảng. Delta/catch-up bị giới hạn, pause không tăng thời gian chơi. Best score và lựa chọn âm thanh được lưu local nếu khả dụng; lỗi storage/audio không làm hỏng game. UI dùng textContent khi render tên leaderboard.

Unit tests bao gồm lifecycle, queue input, scoring/growth, wall/body/tail collision, full-board win, restart, difficulty, snapshot isolation, storage lỗi, demo leaderboard và âm thanh không khả dụng. Browser tests kiểm tra màn hình ready/playing/paused/game-over, restart lặp lại, hướng dẫn, lưu bật/tắt tiếng, mobile layout/D-pad và storage bị chặn. Mobile là mô phỏng Chromium; vẫn nên thử thêm trên iOS/Android thật trước khi phát hành.

## Phạm vi bản local ban đầu (xem cập nhật online bên dưới)

- Backend/database, tài khoản, leaderboard toàn cầu, đồng bộ nhiều thiết bị.
- Hosting production, pipeline deploy CI/CD (cần chọn nền tảng lưu Git/hosting trước).
- Multiplayer và chống gian lận phía server.

Repo được xây dựng trên nhánh develop; không tự commit, push hay merge vào main.


## Leaderboard online — thiết lập Supabase + Vercel

Code hỗ trợ khách nhập tên, cookie HttpOnly có chữ ký và Top 5 toàn website. Không có API hoặc biến môi trường thì bản production hiển thị OFFLINE, không giả dữ liệu online. Chạy bằng `npm run dev` chỉ chạy frontend: khi API không tồn tại sẽ dùng dữ liệu DEMO. Không cần khóa bí mật để chơi local.

### 1. Chạy migration bổ sung

Bạn đã có bảng `player_scores`: mở file `supabase/guest-leaderboard.sql`, sao chép **toàn bộ** vào Supabase → SQL Editor → New query → Run. Migration giữ nguyên dữ liệu, thêm hàm cập nhật kỷ lục nguyên tử và cooldown 1 giây/ID khách. Không tắt RLS, không tạo policy công khai. Chưa có bảng `player_scores` thì phải tạo bảng theo schema đã hướng dẫn trước khi chạy migration.

### 2. Cấu hình Vercel

Trong project Vercel → Settings → Environment Variables, thêm ba biến **chỉ phía server**:

| Biến | Giá trị |
|---|---|
| `SUPABASE_URL` | Project URL từ Supabase |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_...`) hoặc legacy `service_role`, không phải publishable/anon key |
| `GUEST_SESSION_SECRET` | Chuỗi ngẫu nhiên tối thiểu 32 ký tự, tự tạo trên máy |

Tạo secret bằng `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Sao chép kết quả trực tiếp vào Vercel, không gửi chat, không commit. Bật biến cho Production; Preview chỉ nên dùng database thử riêng, không cấp production secrets cho preview không tin cậy. Không đặt tiền tố `VITE_`. `.env.example` chỉ có placeholder; `.env` và `.env.local` được Git bỏ qua.

### 3. Deploy và kiểm tra

Push nhánh develop để xem Preview sau khi cấu hình biến phù hợp. Merge vào main để Vercel tự deploy production. Thay đổi Environment Variables cần một deployment mới (Redeploy nếu cần). Vercel tự nhận các Node Functions trong `api/`; không cần rewrite mọi route vào index.html.

Mở `/api/leaderboard` trên domain deploy: cấu hình đúng sẽ trả JSON `{entries:[],mode:"online"}` khi chưa có điểm. Lỗi 503 thường do thiếu biến môi trường; 502 thường do database/key/migration chưa đúng. Không chia sẻ log chứa secrets. Mở game → PLAY NOW → nhập tên → kết thúc lượt → kiểm tra thông báo lưu thành công và bảng Supabase. Thử một trình duyệt riêng để xác nhận bảng xếp hạng dùng chung. Test local đầy đủ API có thể dùng môi trường phát triển Vercel chính thức với các biến server đặt riêng; Vite frontend một mình không chạy Functions.

### Contract và giới hạn

- `GET /api/guest`: tên từ phiên khách; 401 nếu chưa có/phiên hết hạn.
- `POST /api/guest {name}`: tên 1–24 ký tự; cấp cookie ký, đổi tên giữ ID của phiên hiện tại. Tên trong bảng cập nhật ở lần gửi điểm tiếp theo.
- `GET /api/leaderboard`: Top 5, điểm giảm dần rồi thời gian đạt điểm tăng dần.
- `POST /api/scores {score,elapsed}`: elapsed tính bằng **mili giây chơi thực tế**; chỉ lấy ID/tên từ cookie xác thực, không tin ID do client cung cấp. Điểm thấp không ghi đè kỷ lục cao.
- Điểm gửi thất bại giữ trong bộ nhớ tab để retry; reload/đóng tab sẽ mất lần gửi đang chờ. Điểm cá nhân local vẫn riêng với điểm chung. Có thể bỏ qua nhập tên để chơi local.
- Cookie hết hạn sau 30 ngày kể từ lần cấp/đổi tên. Xóa cookie, hết hạn hoặc đổi trình duyệt/domain sẽ tạo danh tính mới; điểm cũ vẫn tồn tại. Không dùng tên làm ID.
- Client vẫn có thể giả điểm/thời gian. Validation và cooldown theo ID **không phải chống gian lận**, không ngăn người dùng tạo nhiều ID. Cần thêm WAF/rate limiting toàn cục, kiểm duyệt tên, quota/monitoring và xác minh replay/server gameplay trước khi dùng cho thi đấu hoặc quy mô lớn.
- Test API dùng mock HTTP/database, không xác nhận Supabase production thật. Cần chạy SQL, thêm env và thử live để hoàn tất kích hoạt.

Các phần phạm vi cũ ở trên mô tả bản local ban đầu; phiên bản hiện tại đã thêm API/database integration nhưng chưa có đăng nhập tài khoản, multiplayer hoặc xác minh điểm chống gian lận.

