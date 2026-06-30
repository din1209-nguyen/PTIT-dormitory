import { toast } from 'sonner';
import type { UtilityBill } from '@/types/utilityBilling';

// Lấy nhãn phòng từ dữ liệu phòng đã populate hoặc id phòng
export function getRoomLabel(room: UtilityBill['roomId'] | any) {
  if (!room) return '—';
  if (typeof room === 'string') return room;
  const floor = room.floorId && typeof room.floorId === 'object' ? room.floorId : null;
  const building = floor?.buildingId && typeof floor.buildingId === 'object' ? floor.buildingId : null;
  return `${building?.name || ''}${room.roomNumber || ''}`;
}

// Chuyển số tiền thành chữ tiếng Việt
export function docTien(so: number): string {
  if (so === 0) return "Không đồng chẵn.";
  const chuSo = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const donVi = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ"];
  let str = Math.abs(so).toString();
  const groups = [];
  while (str.length > 0) {
    groups.push(str.slice(-3));
    str = str.slice(0, -3);
  }
  const words = [];
  for (let i = 0; i < groups.length; i++) {
    const num = parseInt(groups[i], 10);
    if (num !== 0) {
      const tram = Math.floor(num / 100);
      const chuc = Math.floor((num % 100) / 10);
      const donvi = num % 10;
      const res = [];
      if (groups[i].length === 3 || (i < groups.length - 1 && groups[i].length > 0)) {
        res.push(chuSo[tram] + " trăm");
        if (chuc === 0 && donvi !== 0) res.push("lẻ");
      }
      if (chuc === 1) res.push("mười");
      else if (chuc > 1) res.push(chuSo[chuc] + " mươi");
      if (donvi === 1 && chuc > 1) res.push("mốt");
      else if (donvi === 5 && chuc > 0) res.push("lăm");
      else if (donvi !== 0 || (chuc === 0 && donvi === 0 && tram === 0 && num !== 0)) res.push(chuSo[donvi]);
      
      words.push(res.join(" ") + " " + donVi[i]);
    } else if (i === 3 && groups.length > 3) {
      words.push(donVi[i]);
    }
  }
  let result = words.reverse().join(" ").trim().replace(/\s+/g, ' ');
  result = result.charAt(0).toUpperCase() + result.slice(1);
  return result + " đồng chẵn.";
}

// Định dạng số tiền theo chuẩn Việt Nam
function formatMoney(n: number) {
  return n.toLocaleString('vi-VN') + ' đ';
}

// Tạo file PDF hóa đơn điện nước từ dữ liệu hóa đơn
export function generatePDF(bill: any) {
  if (!bill) return;
  toast.info('Đang tạo hóa đơn PDF, vui lòng đợi...', { id: 'pdf-toast' });
  const container = document.createElement('div');
  const now = new Date();
  const roomLabel = getRoomLabel(bill.roomId);
  
  const elecBeforeTax = bill.electricityCost - (bill.priceConfigSnapshot?.electricVatAmount || 0);
  const waterBeforeTax = bill.priceConfigSnapshot?.waterBeforeTax || 0;
  const wwFee = bill.priceConfigSnapshot?.wastewaterFee || 0;
  
  const totalBeforeTaxAndFee = elecBeforeTax + waterBeforeTax + wwFee;
  const totalVat = (bill.priceConfigSnapshot?.electricVatAmount || 0) + (bill.priceConfigSnapshot?.waterVatAmount || 0);

  container.innerHTML = `
<div style="padding: 30px; font-family: 'Times New Roman', serif; font-size: 13px; color: #000; line-height: 1.4; position: relative;">
  <div style="border: 1px solid #000; padding: 20px;">
    <!-- Header Table -->
    <table style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px;">
      <tr>
        <td style="width: 20%; text-align: center; vertical-align: middle;">
           <img src="https://portal.ptit.edu.vn/wp-content/uploads/2016/04/ptit-logo.png" style="width: 80px; height: 80px; object-fit: contain;" alt="PTIT Logo" />
        </td>
        <td style="width: 50%; text-align: center; vertical-align: middle;">
           <h2 style="margin: 0; font-size: 18px; color: #000; font-weight: bold;">HÓA ĐƠN GIÁ TRỊ GIA TĂNG</h2>
           <p style="margin: 2px 0 0; font-style: italic;">(VAT INVOICE)</p>
           <p style="margin: 5px 0 0; font-style: italic;">Ngày (Date) ${now.getDate()} tháng (month) ${now.getMonth() + 1} năm (year) ${now.getFullYear()}</p>
        </td>
        <td style="width: 30%; font-size: 12px; line-height: 1.6; vertical-align: top;">
           <div>Ký hiệu <span style="font-style:italic">(Serial)</span>: 1C26THV</div>
           <div>Số <span style="font-style:italic">(No.)</span>: <strong style="font-size: 14px;">${String(Math.floor(Math.random() * 100000)).padStart(8, '0')}</strong></div>
        </td>
      </tr>
    </table>
    
    <!-- Seller Info -->
    <div style="margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 10px;">
       <h3 style="margin: 0 0 5px 0; font-size: 15px; text-transform: uppercase;">HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG CƠ SỞ TẠI TP HCM</h3>
       <div style="display: grid; grid-template-columns: 120px 1fr; gap: 4px; font-size: 12px;">
         <div>Mã số thuế <i style="font-size:11px">(Tax code)</i>:</div><div>0106653601-002</div>
         <div>Địa chỉ <i style="font-size:11px">(Address)</i>:</div><div>11 Nguyễn Đình Chiểu, Phường Đa Kao, Quận 1, Thành phố Hồ Chí Minh, Việt Nam</div>
         <div>Điện thoại <i style="font-size:11px">(Tel)</i>:</div><div>028.39107098</div>
       </div>
    </div>
    
    <!-- Buyer Info -->
    <div style="margin-bottom: 15px;">
       <div style="display: grid; grid-template-columns: 160px 1fr; gap: 4px; font-size: 12px;">
         <div>Họ tên người mua <i style="font-size:11px">(Buyer)</i>:</div><div><strong>Đại diện phòng ${roomLabel}</strong></div>
         <div>Tên đơn vị <i style="font-size:11px">(Company name)</i>:</div><div>Tập thể phòng ${roomLabel}</div>
         <div>Địa chỉ <i style="font-size:11px">(Address)</i>:</div><div>Ký túc xá PTIT, Quận 9, Thành phố Thủ Đức</div>
         <div>Thanh toán <i style="font-size:11px">(Payment)</i>:</div><div>Chuyển khoản / Tiền mặt</div>
       </div>
    </div>
    
    <!-- Items Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 12px; border: 1px solid #000;">
      <thead>
        <tr style="border-bottom: 1px solid #000; text-align: center; font-weight: bold;">
          <th style="border-right: 1px solid #000; padding: 5px;">STT<br/><i style="font-weight:normal">(No)</i></th>
          <th style="border-right: 1px solid #000; padding: 5px;">Tên hàng hóa, dịch vụ<br/><i style="font-weight:normal">(Name of goods and services)</i></th>
          <th style="border-right: 1px solid #000; padding: 5px;">Đơn vị<br/><i style="font-weight:normal">(Unit)</i></th>
          <th style="border-right: 1px solid #000; padding: 5px;">Số lượng<br/><i style="font-weight:normal">(Quantity)</i></th>
          <th style="border-right: 1px solid #000; padding: 5px;">Đơn giá<br/><i style="font-weight:normal">(Unit price)</i></th>
          <th style="padding: 5px;">Thành tiền<br/><i style="font-weight:normal">(Amount)</i></th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #ccc;">
          <td style="border-right: 1px solid #000; text-align: center; padding: 5px;">1</td>
          <td style="border-right: 1px solid #000; padding: 5px;">Tiền điện sinh hoạt kỳ ${bill.month}/${bill.year}</td>
          <td style="border-right: 1px solid #000; text-align: center; padding: 5px;">kWh</td>
          <td style="border-right: 1px solid #000; text-align: right; padding: 5px;">${(bill.electricityUsage||0).toLocaleString('vi-VN')}</td>
          <td style="border-right: 1px solid #000; text-align: right; padding: 5px;">-</td>
          <td style="text-align: right; padding: 5px;">${formatMoney(elecBeforeTax).replace(' đ', '')}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ccc;">
          <td style="border-right: 1px solid #000; text-align: center; padding: 5px;">2</td>
          <td style="border-right: 1px solid #000; padding: 5px;">Tiền nước sinh hoạt kỳ ${bill.month}/${bill.year}</td>
          <td style="border-right: 1px solid #000; text-align: center; padding: 5px;">m³</td>
          <td style="border-right: 1px solid #000; text-align: right; padding: 5px;">${(bill.waterUsage||0).toLocaleString('vi-VN')}</td>
          <td style="border-right: 1px solid #000; text-align: right; padding: 5px;">${(bill.priceConfigSnapshot?.waterUnitPrice || 0).toLocaleString('vi-VN')}</td>
          <td style="text-align: right; padding: 5px;">${formatMoney(waterBeforeTax).replace(' đ', '')}</td>
        </tr>
        <tr style="border-bottom: 1px solid #000;">
          <td style="border-right: 1px solid #000; text-align: center; padding: 5px;">3</td>
          <td style="border-right: 1px solid #000; padding: 5px;">Phí bảo vệ môi trường nước</td>
          <td style="border-right: 1px solid #000; text-align: center; padding: 5px;">Lần</td>
          <td style="border-right: 1px solid #000; text-align: right; padding: 5px;">1</td>
          <td style="border-right: 1px solid #000; text-align: right; padding: 5px;">-</td>
          <td style="text-align: right; padding: 5px;">${formatMoney(wwFee).replace(' đ', '')}</td>
        </tr>
        <tr style="border-bottom: 1px solid #000;">
          <td colspan="5" style="border-right: 1px solid #000; text-align: right; padding: 5px; font-weight: bold;">
            Cộng tiền hàng <i style="font-weight:normal">(Total amount excl. VAT)</i>:
          </td>
          <td style="text-align: right; padding: 5px; font-weight: bold;">
            ${formatMoney(totalBeforeTaxAndFee).replace(' đ', '')}
          </td>
        </tr>
        <tr style="border-bottom: 1px solid #000;">
          <td colspan="5" style="border-right: 1px solid #000; text-align: right; padding: 5px; font-weight: bold;">
            Tiền thuế GTGT <i style="font-weight:normal">(VAT amount)</i>:
          </td>
          <td style="text-align: right; padding: 5px;">
            ${formatMoney(totalVat).replace(' đ', '')}
          </td>
        </tr>
        <tr style="border-bottom: 1px solid #000;">
          <td colspan="5" style="border-right: 1px solid #000; text-align: right; padding: 5px; font-weight: bold;">
            Tổng tiền thanh toán <i style="font-weight:normal">(Total amount)</i>:
          </td>
          <td style="text-align: right; padding: 5px; font-weight: bold;">
            ${formatMoney(bill.totalCost).replace(' đ', '')}
          </td>
        </tr>
        <tr>
          <td colspan="6" style="padding: 5px;">
            Số tiền viết bằng chữ <i style="font-style:italic">(Total amount in words)</i>: <strong>${docTien(bill.totalCost)}</strong>
          </td>
        </tr>
      </tbody>
    </table>
    
    <!-- Signatures -->
    <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 12px; padding: 0 40px;">
      <div style="text-align: center;">
        <strong style="font-size: 13px;">Người mua hàng</strong> <i style="font-weight:normal">(Buyer)</i><br/>
        <span style="font-style: italic;">(Ký, ghi rõ họ, tên)</span><br/>
        <span style="font-style: italic;">(Signature, full name)</span>
      </div>
      <div style="text-align: center;">
        <strong style="font-size: 13px;">Người bán hàng</strong> <i style="font-weight:normal">(Seller)</i><br/>
        <span style="font-style: italic;">(Ký, ghi rõ họ, tên)</span><br/>
        <span style="font-style: italic;">(Signature, full name)</span>
        
        <div style="margin-top: 15px; border: 2px solid #4CAF50; color: #d32f2f; padding: 10px; width: 220px; font-weight: bold; font-size: 12px; position: relative; text-align: left;">
           <div style="position: absolute; top: 10px; left: 10px; color: #4CAF50; font-size: 30px; opacity: 0.8;">✔</div>
           <div style="margin-left: 20px;">
             Signature Valid<br/>
             Ký bởi: HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH<br/>VIỄN THÔNG CƠ SỞ TẠI TP.HCM<br/>
             Ký ngày: ${now.toLocaleDateString('vi-VN')}
           </div>
        </div>
      </div>
    </div>
  </div>
</div>
  `;
  const opt = {
    margin: 10,
    filename: `HoaDon_${roomLabel}_${bill.month}_${bill.year}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  if ((window as any).html2pdf) {
    (window as any).html2pdf().set(opt).from(container).save().then(() => toast.dismiss('pdf-toast'));
  } else {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => {
      (window as any).html2pdf().set(opt).from(container).save().then(() => toast.dismiss('pdf-toast'));
    };
    document.body.appendChild(script);
  }
}
