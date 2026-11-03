# SNAKE ARENA

Modern neon Snake arcade, chạy local trên desktop và mobile. Phiên bản hiện tại **không có backend, database, đăng nhập hoặc bảng xếp hạng online**.

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

## Phạm vi chưa triển khai

- Backend/database, tài khoản, leaderboard toàn cầu, đồng bộ nhiều thiết bị.
- Hosting production, pipeline deploy CI/CD (cần chọn nền tảng lưu Git/hosting trước).
- Multiplayer và chống gian lận phía server.

Repo được xây dựng trên nhánh develop; không tự commit, push hay merge vào main.

