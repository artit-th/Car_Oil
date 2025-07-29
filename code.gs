const SHEET_URL = 'ใส่ URL ของ google sheet';
const SHEET_NAME = 'ชื่อชีต';

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  template.carNumber = e.parameter.car || '';
  
  const ss = SpreadsheetApp.openByUrl(SHEET_URL);
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const history = data
    .filter(row => row[2] === template.carNumber)
    .slice(-10)
    .map(row => ({
      date: Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'dd/MM/yyyy'),
      carNumber: row[2],
      mileage: row[3],
      pricePerLiter: row[4],
      amount: row[5],
      liters: row[6]
    }));
  template.history = history;
  
  return template.evaluate()
    .setTitle('Truck Oil Record')
    .setFaviconUrl('https://cdn-icons-png.flaticon.com/512/726/726455.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function saveData(data) {
  try {
    const ss = SpreadsheetApp.openByUrl(SHEET_URL);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const records = sheet.getDataRange().getValues();
    
    const now = new Date();
    const date = Utilities.formatDate(now, 'GMT+7', 'dd/MM/yyyy');
    const time = Utilities.formatDate(now, 'GMT+7', 'HH:mm');
    
    const liters = (data.amount / data.pricePerLiter).toFixed(2);
    
    // ค้นหาเลขไมล์ล่าสุดและวันที่ล่าสุดของเลขทะเบียนนี้
    let lastMileage = 0;
    let lastDate = null;
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i][2] === data.carNumber) {
        lastMileage = records[i][3];
        lastDate = records[i][0];
        break;
      }
    }
    
    // คำนวณระยะทาง
    const distance = (parseFloat(data.mileage) - lastMileage).toFixed(2);
    
    // คำนวณค่าเฉลี่ย กม./วัน
    let kmPerDay = 0;
    if (lastDate) {
      const currentDate = now;
      const previousDate = lastDate instanceof Date ? lastDate : new Date(lastDate);
      const daysDiff = (currentDate - previousDate) / (1000 * 60 * 60 * 24);
      kmPerDay = daysDiff > 0 ? (distance / daysDiff).toFixed(2) : 0;
    }
    
    // คำนวณอัตราสิ้นเปลือง กม./ลิตร
    const kmPerLiter = liters > 0 ? (distance / liters).toFixed(2) : 0;
    
    // คำนวณอัตราสิ้นเปลือง บ./กม.
    const bahtPerKm = distance > 0 ? (data.amount / distance).toFixed(2) : 0;
    
    sheet.appendRow([
      date,
      time,
      data.carNumber,
      data.mileage,
      data.pricePerLiter,
      data.amount,
      liters,
      distance,
      kmPerDay,
      kmPerLiter,
      bahtPerKm,
      data.driver
    ]);
    
    return { status: 'success', message: 'บันทึกข้อมูลสำเร็จ' };
  } catch (error) {
    return { status: 'error', message: 'เกิดข้อผิดพลาด: ' + error.message };
  }
}
