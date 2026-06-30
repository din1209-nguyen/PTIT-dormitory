function wrap(body: string): string {
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
    <div style="background:#AD2030;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0">
      <h2 style="margin:0">PTIT Dormitory</h2>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
      ${body}
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">Học viện Công nghệ Bưu chính Viễn thông</p>
  </div>`;
}

export function billOverdueTemplate(data: { studentName: string; roomNumber: string; amount: number; dueDate: string }) {
  return {
    subject: `[PTIT KTX] Hóa đơn điện nước quá hạn — Phòng ${data.roomNumber}`,
    html: wrap(`
      <p>Xin chào <strong>${data.studentName}</strong>,</p>
      <p>Hóa đơn điện nước phòng <strong>${data.roomNumber}</strong> đã quá hạn thanh toán.</p>
      <p>Số tiền: <strong>${data.amount.toLocaleString('vi-VN')} đ</strong></p>
      <p>Hạn thanh toán: <strong>${data.dueDate}</strong></p>
      <p>Vui lòng thanh toán sớm nhất có thể.</p>
    `),
  };
}

export function residenceReminderTemplate(data: { studentName: string; endDate: string }) {
  return {
    subject: '[PTIT KTX] Nhắc nhở hết hạn lưu trú',
    html: wrap(`
      <p>Xin chào <strong>${data.studentName}</strong>,</p>
      <p>Thời hạn lưu trú của bạn sẽ kết thúc vào ngày <strong>${data.endDate}</strong>.</p>
      <p>Vui lòng liên hệ ban quản lý KTX nếu cần gia hạn.</p>
    `),
  };
}

export function genericNotificationTemplate(data: { title: string; content: string }) {
  return {
    subject: `[PTIT KTX] ${data.title}`,
    html: wrap(`
      <h3>${data.title}</h3>
      <p>${data.content}</p>
    `),
  };
}

export function newStudentRegistrationTemplate(data: { studentName: string; studentCode: string; password: string; semesterName: string }) {
  return {
    subject: '[PTIT KTX] Đăng ký lưu trú thành công và thông tin tài khoản',
    html: wrap(`
      <p>Xin chào <strong>${data.studentName}</strong>,</p>
      <p>Bạn đã được ghi nhận đăng ký lưu trú thành công cho kỳ <strong>${data.semesterName}</strong> và đang ở trạng thái chờ xếp phòng.</p>
      <p>Hệ thống đã tạo tài khoản sinh viên cho bạn:</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin:16px 0">
        <p style="margin:0 0 8px">Tài khoản: <strong>${data.studentCode}</strong></p>
        <p style="margin:0">Mật khẩu tạm: <strong>${data.password}</strong></p>
      </div>
      <p>Vui lòng đăng nhập và đổi mật khẩu trong lần đầu sử dụng.</p>
      <p>Trân trọng,<br/>Ban quản lý Ký túc xá PTIT</p>
    `),
  };
}

export function returningStudentRegistrationTemplate(data: { studentName: string; studentCode: string; semesterName: string }) {
  return {
    subject: '[PTIT KTX] Đăng ký lưu trú thành công',
    html: wrap(`
      <p>Xin chào <strong>${data.studentName}</strong>,</p>
      <p>Hồ sơ đăng ký lưu trú của bạn cho kỳ <strong>${data.semesterName}</strong> đã được ghi nhận thành công.</p>
      <p>Mã sinh viên: <strong>${data.studentCode}</strong></p>
      <p>Bạn đang ở trạng thái chờ xếp phòng. Vui lòng theo dõi thông báo trên hệ thống.</p>
      <p>Trân trọng,<br/>Ban quản lý Ký túc xá PTIT</p>
    `),
  };
}
