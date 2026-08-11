export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on server.' });
    }

    const { target, apartment, message, hook, duration, model = 'gemini-3.6-flash', refScript = '', refVideo = '', systemInstruction, userMessage } = req.body;

    // Direct call fallback if explicitly passing systemInstruction & userMessage
    if (systemInstruction && userMessage) {
        try {
            const rawText = await callGeminiSingle(systemInstruction, userMessage, apiKey, model);
            return res.status(200).json({ result: rawText, candidates: [{ content: { parts: [{ text: rawText }] } }] });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (!target || !message || !hook) {
        return res.status(400).json({ error: 'Missing required fields: target, message, hook' });
    }

    // SERVER-SIDE HIDDEN DATA & SYSTEM PROMPTS FOR PENINSULA PRIVATE
    const DATA_PENINSULA_PRIVATE = 
        `DU AN: PENINSULA PRIVATE (TP. Da Nang)
Chu dau tu: Lien danh Cong ty CP Tap doan Dong Do & Cong ty TNHH MTV Dau tu Athena Luxury. Don vi phan phoi chien luoc: Dat Xanh Mien Trung.
Vi tri: To hop Da Nang Downtown, trung tam Quan Hai Chau, TP. Da Nang. Ket noi nhanh chong den song Han (3 phut), Lotte Mart, truong hoc, benh vien, san bay va bien My Khe.
Quy mo: Thap can ho bieu tuong cao 39 tang noi (chieu cao gan 150m: 149.8m), mat do xay dung chi 40%, 3 tang ham do xe thong minh.
So luong san pham: Khoang 612 - 630 can ho thuong mai cao cap.
Co cau dien tich:
  - Căn Studio: Can ~36m2 (124 can), TMDV ~34.37m2.
  - Can ho 1PN: Can ~47m2 (302 can).
  - Can ho 2PN: Can ~72m2 den 79m2 (178 can), Can dac biet ~78.98m2 (1 can).
  - Can ho 3PN: Can ~121.8m2 (8 can), Can ~150-170m2 (5 can).
  - Can ho 4PN: Can lon ~210-280m2 (5 can).
  - Sieu can ho/Sky Villa/Penthouse: Can ~430-460m2 (3 can), Can ~540-590m2 (2 can).
Tieu chuan ban giao: Full noi that lien tuong cao cap. Su dung kinh hop Low-E day 27.5mm cach am, cach nhiet va ngan tia UV vuot troi. Thiet bi ve sinh va bep tu cac thuong hieu hang dau (Bosch, Hafele, Kohler/Grohe). Cua chong chay American Doors, sanh don sang trong op da Marble tu nhien.
Gia ban: Tu 65 trieu dong/m2 (da bao gom VAT).

CHINH SACH BAN HANG DU KIEN (Thang 07/2026):
  - Nhan dat cho uu tien (Booking): 50 trieu dong/suat (co hoan phi).
  - Chiet khau thanh toan nhanh: Dat muc tu 13.5% den 15.5%.
  - Chiet khau thanh toan tien do: Tu 6% den 7.5%.
  - Ho tro vay von: Ngan hang lien ket ho tro cho vay toi da 70% gia tri can ho.
  - Uu dai lai suat & An han goc: Lai suat 0% tu 18 den 24 thang, an han no goc den khi nhan ban giao nha.
  - Qua tang: Mien phi quan ly van hanh tu 2 den 3 nam.

BOI CANH GIAI DOAN 3 (GIO HANG CUOI CUNG - SAP CAT NOC):
  Day la dot mo ban cuoi cung. Co hoi cuoi cung de mua gia goc tu chu dau tu truoc khi cat noc. Sau khi cat noc gia se tang manh.`;

    const sysAssistant1 = 
        "Ban la Senior Copywriter va chuyen gia tam ly hoc hanh vi khach hang cao cap (HNWIs) tai Viet Nam.\n\n" +
        "NHIEM VU CHINH:\n" +
        "Dựa vào Target doi tuong, hãy tự động nhận diện họ thuộc nhóm nào trong 5 nhóm sau để viết PROMPT chiến lược:\n" +
        "1. Đầu tư cho thuê: Khao khát dòng tiền bền vững, sợ lạm phát mất giá tiền tệ.\n" +
        "2. Đầu tư bán lại: Muốn tối ưu biên lợi nhuận trước cất nóc, mua lúc rẻ bán lúc cất nóc xong/hoàn thiện.\n" +
        "3. Mua ở nội đô: Muốn nâng cấp không gian sống cao cấp, sợ nhà ngõ chật hẹp, ẩm mốc, thiếu tiện ích.\n" +
        "4. Khách xa quê (người Đà Nẵng/quê miền Trung ở HN/SG/Kiều bào): Hướng về nguồn cội, báo hiếu cha mẹ, mua tài sản di sản truyền đời để làm nơi trở về.\n" +
        "5. Khách mua lưu trú (thường ghé Đà Nẵng): Muốn có căn hộ trú ẩn 5 sao riêng tư tuyệt đối của riêng mình thay thế sự phiền toái, thiếu an toàn tại khách sạn công cộng.\n\n" +
        "YÊU CẦU PROMPT CHIẾN LƯỢC CHO CREATOR:\n" +
        "- Phải tạo ra các Hook (0-3s) đánh trúng tử huyệt tâm lý của nhóm đối tượng nhận diện được ở trên.\n" +
        "- Cài đặt sự thúc giục: Giỏ hàng đợt cuối và mốc cất nóc đang đếm ngược ngày.\n" +
        "- TẬP TRUNG THIẾT KẾ QUAY VỚI HOST (NGƯỜI THẬT) DẪN DẮT xuyên suốt video.\n\n" +
        "CHI tra ve doan prompt chien luoc bang tieng Viet. Khong giai thich, khong bat ky thong tin nao khac.";

    const sysCreator = 
        "Ban la Creative Director va Chuyen gia Viet Ad Copy Biet Thu & Bat Dong San Sieu Sang Viet Nam.\n\n" +
        "KHUNG HƯỚNG DẪN MARKETING 4 GIAI ĐOẠN (ĐỊNH HƯỚNG CHIẾN LƯỢC - HỌC THEO ĐỔI VỚI NỘI DUNG VÀ THỜI LƯỢNG KỊCH BẢN):\n" +
        "1. [GIAI ĐOẠN 1: HOOK & NỖI ĐẦU] (Mốc [0:00 - 0:06]): Chạm vào nỗi đau/sự tò mò của KH (áp lực tài chính, sống chật chội, đầu tư kém hiệu quả, khát khao nâng tầm cuộc sống). Hook 0-3s cực mạnh để ngắt nhịp cuộn Meta (Pattern Interrupt).\n" +
        "2. [GIAI ĐOẠN 2: BỐI CẢNH & GIẢI PHÁP] (Mốc [0:06 - 0:20]): Giúp KH hình dung cuộc sống lý tưởng: vị trí đắc địa, không gian thư giãn, tiện ích như giải pháp hoàn hảo cho Cảnh 1.\n" +
        "3. [GIAI ĐOẠN 3: CẢM XÚC SỞ HỮU & TÀI CHÍNH] (Mốc [0:20 - 0:45]): Đánh mạnh cảm xúc mong muốn sở hữu, an tâm tài chính, chính sách 0% lãi suất, giá trị tăng giá và chất sống thượng lưu.\n" +
        "4. [GIAI ĐOẠN 4: CẤP BÁCH & KÊU GỌI HÀNH ĐỘNG] (Mốc [0:45 - Hết]): Tạo cảm giác cấp bách, quỹ căn giới hạn, ưu đãi hiếm có, thúc đẩy Đăng ký/Gọi Hotline ngay.\n\n" +
        "YÊU CẦU TỐI ƯU THUẬT TOÁN META ADS & TỶ LỆ GIỮ CHÂN (RETENTION):\n" +
        "- SỐ LƯỢNG PHÂN CẢNH: Không giới hạn cứng ở 4 cảnh. Linh hoạt viết từ 5 ĐẾN 8 CẢNH PHÂN PHỐI DỒN DẬP (Tùy thuộc tổng thời lượng video chọn: 45s, 60s, 75s, 90s) để tối ưu hiển thị Meta Ads.\n" +
        "- Nhịp độ (Pacing): Thời lượng mỗi cảnh linh hoạt từ 3s - 10s. Text Overlay ngắn gọn, nổi bật dành cho người xem tắt tiếng (Sound-off viewers).\n" +
        "- Thiết kế kịch bản xoay quanh HOST (người dẫn chương trình / KOC Reviewer thực tế) xuất hiện sinh động xuyên suốt.\n\n" +
        "YÊU CẦU ĐẦU RA: Xuất ĐÚNG MỘT JSON ARRAY [] gồm 5-8 phân cảnh. Mỗi phân cảnh có 6 trường:\n" +
        "  'stt' (số nguyên 1, 2, 3, 4...), 'duration' (VD: '5 giây', '10 giây'...), 'message', 'visual', 'textOverlay', 'vo'.\n" +
        "Tuyệt đối chỉ trả về JSON thuần [ ... ]. Không dùng markdown, không thông tin ngoài JSON.";

    let benchmarkInfo = "";
    if (refVideo || refScript) {
        benchmarkInfo = "\n\nMẪU THAM KHẢO HƯỚNG TỚI (BENCHMARK TARGET):\n";
        if (refVideo) benchmarkInfo += `- Link Video Mẫu: ${refVideo}\n`;
        if (refScript) benchmarkInfo += `- Kịch Bản Mẫu Tham Khảo:\n"""\n${refScript}\n"""\n`;
        benchmarkInfo += "(Hãy học theo tông giọng, phong cách dẫn của Host và nhịp điệu Hook từ Mẫu Tham Khảo trên khi tạo kịch bản mới!).\n";
    }

    const csbhCanho = "Chính sách Peninsula Private: Booking 50 triệu (hoàn phí), CK đến 15.5% thanh toán nhanh, 0% lãi suất vay 70% từ 18-24 tháng, ân hạn nợ gốc, miễn phí vận hành 2-3 năm.";
    const userMsg1 = `BO DU LIEU DU AN:\n${DATA_PENINSULA_PRIVATE}\n\nCHIEN DICH CAN VIET KICH BAN:\nLoai can ho: ${apartment}\nCSBH: ${csbhCanho}\nTarget doi tuong: ${target}\nThong diep: ${message}\nHook: ${hook}\nThoi luong: ${duration}${benchmarkInfo}`;

    try {
        // Step 1: Strategic prompt creation
        const promptChuan = await callGeminiSingle(sysAssistant1, userMsg1, apiKey, model);

        // Step 2: Storyboard generation
        const userMsg2 = `BO DU LIEU DU AN:\n${DATA_PENINSULA_PRIVATE}\n\nPROMPT CHIEN LUOC TU ASSIST ASSISTANT 1:\n${promptChuan}${benchmarkInfo}`;
        const jsonRaw = await callGeminiSingle(sysCreator, userMsg2, apiKey, model);

        return res.status(200).json({ result: jsonRaw, candidates: [{ content: { parts: [{ text: jsonRaw }] } }] });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

async function callGeminiSingle(systemPrompt, userMessage, apiKey, model) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const payload = {
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 16384 }
    };

    const headers = { "Content-Type": "application/json" };
    if (apiKey.startsWith("AQ.")) {
        headers["Authorization"] = `Bearer ${apiKey}`;
    } else {
        headers["x-goog-api-key"] = apiKey;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Mô hình AI không trả về kết quả hợp lệ.');
    }
    const parts = data.candidates[0].content.parts;
    for (let p = 0; p < parts.length; p++) {
        if (parts[p].text && !parts[p].thought) return parts[p].text;
    }
    for (let q = parts.length - 1; q >= 0; q--) {
        if (parts[q].text) return parts[q].text;
    }
    throw new Error('Không tìm thấy nội dung văn bản trong response.');
}
