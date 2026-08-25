export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const openAiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!openAiKey && !geminiKey) {
        return res.status(500).json({ error: 'Chưa cấu hình API Key cho ChatGPT hoặc Gemini trên server.' });
    }

    const { target, apartment, message, hook, duration, refScript = '', refVideo = '', systemInstruction, userMessage } = req.body;

    // Direct call fallback if explicitly passing systemInstruction & userMessage
    if (systemInstruction && userMessage) {
        try {
            const { text, modelName } = await callAIWithCascade(systemInstruction, userMessage, geminiKey, openAiKey);
            return res.status(200).json({ 
                result: text, 
                modelUsed: modelName,
                candidates: [{ content: { parts: [{ text: text }] } }] 
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (!target || !message || !hook) {
        return res.status(400).json({ error: 'Missing required fields: target, message, hook' });
    }

    // SERVER-SIDE OFFICIAL DATA & SYSTEM PROMPTS FOR PENINSULA PRIVATE DA NANG
    const DATA_PENINSULA_PRIVATE = 
        `DU AN: PENINSULA PRIVATE DA NANG (Ra mat can ho cao cap lien ke Da Nang Downtown)
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
Tieu chuan ban giao: Full noi thought lien tuong cao cap. Su dung kinh hop Low-E day 27.5mm cach am, cach nhiet va ngan tia UV vuot troi. Thiet bi ve sinh va bep tu cac thuong hieu hang dau (Bosch, Hafele, Kohler/Grohe). Cua chong chay American Doors, sanh don sang trong op da Marble tu nhien.

BANG CHINH SACH BAN HANG CHINHTHUC (CHUAN 100% TU CĐT - NHO CON SO NAY, KHONG DUNG BAT KY CON SO SAI LECH NAO KHAC):
  - Gia du kien: 65 trieu dong/m2 (da bao gom VAT).
  - Voucher Dat cho / Booking uu tien 5 cap do:
    + Uu tien 5: Voucher Dat cho len den 50 Trieu.
    + Uu tien 4: Voucher Dat cho 40 Trieu.
    + Uu tien 3: Voucher Dat cho 30 Trieu.
    + Uu tien 2: Voucher Dat cho 20 Trieu.
  - Chiet khau Khach hang Booking: Giam truc tiep 3%.
  - Chiet khau Khach hang than thiet: Giam them 2%.
  - Chiet khau Khach hang Mua si:
    + Mua si tu 2 den 4 can: Giam them 1.5%.
    + Mua si tu 5 can tro len: Giam them 2%.

BOI CANH DỰ ÁN & QUY TẮC QUAY DỰNG (RẤT QUAN TRỌNG - CHƯA CÓ NHÀ MẪU VÀ CHƯA CÓ SA BÀN):
  - DỰ ÁN ĐANG Ở GIAI ĐOẠN 1: Mở Booking nhận đặt chỗ đợt đầu tiên để nhận Voucher ưu tiên đến 50 triệu và chiết khấu Booking 3%.
  - THỰC TRẠNG HIỆN TẠI: Dự án CHƯA CÓ NHÀ MẪU và CHƯA CÓ SA BÀN. Hiện tại vị trí dự án chỉ mới là MẢNH ĐẤT TRỐNG kề bên sông Hàn.
  - TUYỆT ĐỐI KHÔNG DÙNG: Không mô tả Host đứng trong nhà mẫu, không tương tác với nội thất nhà mẫu, không đứng chỉ sa bàn.
  - BỐI CẢNH QUAY THỰC TẾ & KỸ THUẬT VISUAL THAY THẾ:
    + Host đứng quay thực tế ngay tại mảnh đất trống kề bên bờ sông Hàn, chỉ tay hướng về vị trí quỹ đất và view dòng sông Hàn / trung tâm Hải Châu.
    + Flycam 4K quay góc rộng từ trên cao xuống mảnh đất trống kề sông Hàn, sau đó lồng ghép phối cảnh 3D render kiến trúc tháp 39 tầng cao 149.8m mọc lên hùng vĩ (Matchmove 3D / AR VFX).
    + Lồng ghép hình ảnh 3D render thiết kế không gian căn hộ cao cấp, map animation 3D kết nối hạ tầng và đồ họa infographic chính sách chuẩn: Booking giảm 3%, Voucher đến 50tr, KH thân thiết thêm 2%, Mua sỉ thêm 1.5% - 2%.`;

    const RULE_COMPLIANCE = 
        `\n\nQUY ĐỊNH TUÂN THỦ TRUYỀN THÔNG BẮT BUỘC (QĐ DAT XANH MIEN TRUNG 03/08/2026 - NGHÊM CẤM VI PHẠM):
TUYỆT ĐỐI KHÔNG SỬ DỤNG CÁC TỪ/CỤM TỪ CẤM SAU TRONG KỊCH BẢN (TEXT OVERLAY, VO, VISUAL, MESSAGE):
1. NGHÊM CẤM TỪ HẠ GIÁ / PHÁ GIÁ: Không dùng "Giá chỉ còn", "giá sau chiết khấu", "giá net", "giá thực nhận", "giá đáy", "giá sốc", "giá sập sàn", "rẻ nhất thị trường", "xả hàng", "xả kho", "bán tháo", "cắt lỗ", "hàng ngợp", "giá mồi", "căn mồi". (Chỉ dùng: "Giá niêm yết từ 65 triệu/m2").
2. NGHÊM CẤM TỪ SUẤT RIÊNG / ẢO: Không dùng "Suất nội bộ", "suất ngoại giao", "suất Chủ đầu tư", "suất lãnh đạo", "chiết khấu riêng", "hoàn tiền riêng/cashback", "chia lại hoa hồng", "tặng chênh", "quà ngoài chính sách".
3. NGHÊM CẤM CAM KẾT LỢI NHUẬN / RỦI RO: Không dùng "Chắc chắn tăng giá", "cam kết tăng giá", "mua là lời", "lãi ngay", "lợi nhuận bảo đảm", "không rủi ro", "cam kết cho thuê", "dòng tiền cố định", "tỷ suất chắc chắn". (Chỉ dùng: "Tiềm năng gia tăng giá trị", "khả năng khai thác tham khảo").
4. NGHÊM CẤM TẠO KHAN HIẾM ẢO: Không dùng "Chỉ còn duy nhất", "sắp hết hàng", "cháy hàng", "sold out", "giỏ hàng cuối cùng", "tăng giá ngày mai", "cơ hội cuối cùng". (Chỉ dùng: "Số lượng sản phẩm cập nhật tại thời điểm tư vấn").
5. NGHÊM CẤM PHÁP LÝ TUYỆT ĐỐI SAI THỰC TẾ: Không dùng "Pháp lý 100%", "đã đủ toàn bộ pháp lý", "sổ hồng trao tay", "sở hữu vĩnh viễn", "bàn giao chắc chắn", "ngân hàng bảo lãnh 100%".
6. NGHÊM CẤM TỪ KHÓA TỰ PHONG / CHUẨN 5 SAO: Không dùng "Dự án số 1", "duy nhất", "tốt nhất", "đẳng cấp nhất", "view vĩnh viễn", "không bị che chắn", "không tiếng ồn", "100% căn view sông", "chuẩn 5 sao/6 sao", "tiêu chuẩn quốc tế". (Chỉ dùng: "Nổi bật", "khác biệt", "bàn giao cao cấp").
7. NGHÊM CẤM BẪY TÀI CHÍNH GÂY HIỂU NHẦM: Không dùng "0 đồng sở hữu", "không cần vốn", "vay 0 đồng", "chỉ trả.../tháng là sở hữu". Nếu có dòng tiền trả theo tháng phải kèm ghi chú "(Minh họa dòng tiền, không phải giá bán)".
8. BẮT BUỘC THÊM THẺ GHI CHÚ KHI CÓ CẢNH 3D/AI: Trong các phân cảnh visual có hiệu ứng 3D render hoặc lồng ghép AI, bắt buộc phải thêm dòng chữ "(Hình ảnh minh họa có sử dụng công nghệ AI)" trong textOverlay hoặc visual.`;

    const sysAssistant1 = 
        "Ban la Senior Copywriter va chuyen gia tam ly hoc hanh vi khach hang cao cap (HNWIs) tai Viet Nam.\n\n" +
        "NHIEM VU CHINH:\n" +
        "Dựa vào Target doi tuong, hãy tự động nhận diện họ thuộc nhóm nào trong 5 nhóm sau để viết PROMPT chiến lược cho GIAI ĐOẠN MỞ BOOKING ĐỢT 1:\n" +
        "1. Đầu tư cho thuê: Khao khát dòng tiền bền vững tại trung tâm Đà Nẵng, muốn booking chọn căn view đẹp đợt 1 nhận ưu đãi giảm 3%.\n" +
        "2. Đầu tư bán lại / Mua sỉ: Muốn mua giá gốc 65tr/m2 đợt 1, cộng dồn chiết khấu Booking 3%, KH thân thiết 2%, Mua sỉ 1.5% - 2% để tối ưu biên lợi nhuận.\n" +
        "3. Mua ở nội đô: Muốn nâng cấp không gian sống cao cấp tại trung tâm Hải Châu, chọn căn hướng sông đẹp nhất đợt đầu.\n" +
        "4. Khách xa quê (người Đà Nẵng/quê miền Trung ở HN/SG/Kiều bào): Hướng về nguồn cội, booking đợt 1 nhận voucher ưu tiên đến 50 triệu.\n" +
        "5. Khách mua lưu trú (thường ghé Đà Nẵng): Muốn có căn hộ trú ẩn cao cấp riêng tư tại Đà Nẵng Downtown với giá dự kiến 65tr/m2.\n\n" +
        "YÊU CẦU PROMPT CHIẾN LƯỢC CHO CREATOR:\n" +
        "- Phải tạo ra các Hook (0-3s) đánh trúng tử huyệt tâm lý của nhóm đối tượng nhận diện được ở trên.\n" +
        "- Cài đặt sự thúc giục: Suất Booking nhận Voucher đến 50 triệu và giảm ngay 3% đang được săn đón để lấy quyền ưu tiên chọn căn đẹp đợt 1.\n" +
        "- LƯU Ý BỐI CẢNH BẮT BUỘC: CHƯA CÓ NHÀ MẪU VÀ CHƯA CÓ SA BÀN (Hiện tại vị trí dự án chỉ mới là MẢNH ĐẤT TRỐNG kề sông Hàn). Hướng dẫn Creator quay Host trực tiếp tại mảnh đất trống kề bờ sông Hàn, lồng ghép hiệu ứng 3D render kiến trúc tháp 39 tầng mọc lên trên mảnh đất và infographic chính sách chuẩn CĐT." +
        RULE_COMPLIANCE + "\n\nCHI tra ve doan prompt chien luoc bang tieng Viet. Khong giai thich, khong bat ky thong tin nao khac.";

    const sysCreator = 
        "Ban la Creative Director va Chuyen gia Viet Ad Copy Biet Thu & Bat Dong San Sieu Sang Viet Nam.\n\n" +
        "KHUNG HƯỚNG DẪN MARKETING 4 GIAI ĐOẠN (ĐỊNH HƯỚNG CHIẾN LƯỢC CHO GIAI ĐOẠN 1 - MỞ BOOKING ĐỢT 1 - CHƯA CÓ NHÀ MẪU & CHƯA CÓ SA BÀN):\n" +
        "1. [GIAI ĐOẠN 1: HOOK & NỖI ĐẦU] (Mốc [0:00 - 0:06]): Chạm vào nỗi đau/sự tò mò của KH (áp lực tài chính, sợ bỏ lỡ suất chọn căn đợt 1, đầu tư kém hiệu quả, khát khao sở hữu căn hộ sông Hàn). Hook 0-3s cực mạnh để ngắt nhịp cuộn Meta (Pattern Interrupt).\n" +
        "2. [GIAI ĐOẠN 2: BỐI CẢNH & GIẢI PHÁP] (Mốc [0:06 - 0:20]): Giúp KH hình dung vị trí đắc địa Hải Châu kề sông Hàn 65tr/m2, lồng ghép phối cảnh 3D tháp 39 tầng mọc lên từ mảnh đất trống, tiện ích cao cấp như giải pháp hoàn hảo cho Cảnh 1.\n" +
        "3. [GIAI ĐOẠN 3: CẢM XÚC SỞ HỮU & TÀI CHÍNH] (Mốc [0:20 - 0:45]): Đánh mạnh cảm xúc mong muốn sở hữu đợt 1, an tâm tài chính với Voucher đặt chỗ đến 50 triệu, chiết khấu Booking giảm trực tiếp 3%, KH thân thiết giảm thêm 2%, mua sỉ từ 2 căn giảm thêm 1.5% - 2%.\n" +
        "4. [GIAI ĐOẠN 4: CẤP BÁCH & KÊU GỌI HÀNH ĐỘNG] (Mốc [0:45 - Hết]): Tạo cảm giác cấp bách suất voucher booking ưu tiên chọn căn tầng đẹp đợt 1 có giới hạn, thúc đẩy Đăng ký/Gọi Hotline giữ chỗ ngay.\n\n" +
        "YÊU CẦU QUAY DỰNG (BẮT BUỘC TUÂN THỦ TRUYỀN THÔNG):\n" +
        "- CHƯA CÓ NHÀ MẪU VÀ CHƯA CÓ SA BÀN: Tuyệt đối không mô tả Host đứng trong nhà mẫu hay chỉ vào sa bàn. Vị trí hiện tại chỉ là MẢNH ĐẤT TRỐNG kề bên sông Hàn.\n" +
        "- HƯỚNG DẪN VISUAL SÁNG TẠO THAY THẾ:\n" +
        "  1. Host đứng quay thực tế ngay tại mảnh đất trống kề bờ sông Hàn, view toàn cảnh sông Hàn & trung tâm Hải Châu sôi động.\n" +
        "  2. Cảnh Flycam từ trên cao lia xuống mảnh đất trống, lồng ghép hiệu ứng matchmove 3D render tòa tháp 39 tầng cao 149.8m mọc lên đầy kiêu hãnh.\n" +
        "  3. Lồng ghép hình ảnh 3D render thiết kế không gian nội thất cao cấp, map animation 3D kết nối hạ tầng và đồ họa motion graphics chính sách chuẩn: Booking giảm 3%, Voucher đến 50tr, KH thân thiết thêm 2%, Mua sỉ thêm 1.5% - 2%.\n" +
        "- TỐI ƯU THUẬT TOÁN META ADS: 5 đến 8 cảnh phân phối dồn dập, Text Overlay ngắn gọn nổi bật dành cho người xem tắt tiếng (Sound-off viewers), Host người thật dẫn dắt sinh động." +
        RULE_COMPLIANCE + "\n\nYÊU CẦU ĐẦU RA: Xuất ĐÚNG MỘT JSON ARRAY [] gồm 5-8 phân cảnh. Mỗi phân cảnh có 6 trường:\n" +
        "  'stt' (số nguyên 1, 2, 3, 4...), 'duration' (VD: '5 giây', '10 giây'...), 'message', 'visual', 'textOverlay', 'vo'.\n" +
        "Tuyệt đối chỉ trả về JSON thuần [ ... ]. Không dùng markdown, không thông tin ngoài JSON.";

    let benchmarkInfo = "";
    if (refVideo || refScript) {
        benchmarkInfo = "\n\nMẪU THAM KHẢO HƯỚNG TỚI (BENCHMARK TARGET):\n";
        if (refVideo) benchmarkInfo += `- Link Video Mẫu: ${refVideo}\n`;
        if (refScript) benchmarkInfo += `- Kịch Bản Mẫu Tham Khảo:\n"""\n${refScript}\n"""\n`;
        benchmarkInfo += "(Hãy học theo tông giọng, phong cách dẫn của Host và nhịp điệu Hook từ Mẫu Tham Khảo trên khi tạo kịch bản mới!).\n";
    }

    const csbhCanho = "Chính sách chính thức Peninsula Private: Giá 65 triệu/m², Voucher đặt chỗ đến 50 triệu (ưu tiên 5 cấp độ), Giảm trực tiếp 3% cho KH Booking, Giảm thêm 2% cho KH thân thiết, Giảm thêm 1.5% - 2% cho KH mua sỉ.";
    const userMsg1 = `BO DU LIEU DU AN:\n${DATA_PENINSULA_PRIVATE}\n\nCHIEN DICH CAN VIET KICH BAN:\nLoai can ho: ${apartment}\nCSBH: ${csbhCanho}\nTarget doi tuong: ${target}\nThong diep: ${message}\nHook: ${hook}\nThoi luong: ${duration}${benchmarkInfo}`;

    try {
        // Step 1: Strategic prompt creation (Primary: ChatGPT -> Fallback: Gemini)
        const step1 = await callAIWithCascade(sysAssistant1, userMsg1, geminiKey, openAiKey);

        // Step 2: Storyboard generation (Primary: ChatGPT -> Fallback: Gemini)
        const userMsg2 = `BO DU LIEU DU AN:\n${DATA_PENINSULA_PRIVATE}\n\nPROMPT CHIEN LUOC TU ASSIST ASSISTANT 1:\n${step1.text}${benchmarkInfo}`;
        const step2 = await callAIWithCascade(sysCreator, userMsg2, geminiKey, openAiKey);

        return res.status(200).json({ 
            result: step2.text, 
            modelUsed: step2.modelName,
            engine: step2.engine,
            candidates: [{ content: { parts: [{ text: step2.text }] } }] 
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

async function callAIWithCascade(systemPrompt, userMessage, geminiApiKey, openAiApiKey) {
    let lastError = null;

    // =========================================================================
    // TẦNG 1: ƯU TIÊN SỐ 1 DÙNG CHATGPT (OPENAI) THEO THỨ TỰ ƯU TIÊN
    // =========================================================================
    if (openAiApiKey) {
        const openAiModels = [
            { name: 'gpt-4o', label: 'OpenAI ChatGPT (GPT-4o Flagship)' },
            { name: 'o3-mini', label: 'OpenAI ChatGPT (o3-mini Reasoning)' },
            { name: 'gpt-4o-mini', label: 'OpenAI ChatGPT (GPT-4o Mini)' },
            { name: 'gpt-4.1-mini', label: 'OpenAI ChatGPT (GPT-4.1 Mini)' }
        ];

        for (const m of openAiModels) {
            try {
                const resText = await callOpenAISingle(systemPrompt, userMessage, openAiApiKey, m.name);
                return { text: resText, modelName: m.label, engine: 'openai' };
            } catch (err) {
                console.warn(`[OpenAI] Model ${m.name} không khả dụng: ${err.message}. Đang thử phương án tiếp theo...`);
                lastError = err;
            }
        }
    }

    // =========================================================================
    // TẦNG 2: TỰ ĐỘNG DỰ PHÒNG SANG GOOGLE GEMINI KHI CHATGPT HẾT USAGE/TOKEN
    // =========================================================================
    if (geminiApiKey) {
        const geminiModels = [
            { name: 'gemini-3.7-flash', thinkingBudget: 4096, label: 'Google Gemini 3.7 Flash (High Reasoning)' },
            { name: 'gemini-3.6-flash', thinkingBudget: 0, label: 'Google Gemini 3.6 Flash' },
            { name: 'gemini-3.5-flash', thinkingBudget: 0, label: 'Google Gemini 3.5 Flash' }
        ];

        for (const m of geminiModels) {
            try {
                const resText = await callGeminiSingle(systemPrompt, userMessage, geminiApiKey, m.name, m.thinkingBudget);
                const tag = openAiApiKey ? `${m.label} (Fallback tự động khi ChatGPT hết Usage)` : m.label;
                return { text: resText, modelName: tag, engine: 'gemini' };
            } catch (err) {
                console.warn(`[Gemini] Model ${m.name} gặp lỗi: ${err.message}. Đang thử fallback...`);
                lastError = err;
            }
        }
    }

    throw new Error(`Tất cả các mô hình AI (ChatGPT & Gemini) đều không thể xử lý: ${lastError ? lastError.message : 'Unknown error'}`);
}

async function callOpenAISingle(systemPrompt, userMessage, apiKey, model) {
    const url = 'https://api.openai.com/v1/chat/completions';
    const messages = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userMessage });

    const payload = {
        model: model,
        messages: messages,
        temperature: 0.85
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenAI HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        throw new Error('OpenAI không trả về nội dung văn bản hợp lệ.');
    }
    return data.choices[0].message.content;
}

async function callGeminiSingle(systemPrompt, userMessage, apiKey, model, thinkingBudget = 0) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    
    const genConfig = { temperature: 0.85, maxOutputTokens: 16384 };
    if (thinkingBudget > 0 && model.includes('3.7')) {
        genConfig.thinkingConfig = { thinkingBudget: thinkingBudget };
    }

    const payload = {
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: genConfig
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gemini HTTP ${response.status}: ${text}`);
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
