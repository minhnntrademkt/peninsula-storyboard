// In-memory Circuit Breaker for OpenAI & Response Cache
let openaiCircuit = {
    isOpen: false,
    openUntil: 0,
    reason: ''
};

const responseCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 phút

export default async function handler(req, res) {
    // 1. CORS Security Hardening
    const origin = req.headers.origin || '';
    const allowedOrigins = [
        'https://peninsula-storyboard.vercel.app',
        'https://hue-heritage.vercel.app',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ];

    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const openAiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!openAiKey && !geminiKey) {
        return res.status(500).json({ error: 'Chưa cấu hình API Key cho ChatGPT hoặc Gemini trên server.' });
    }

    let { target, apartment, message, hook, duration, refScript = '', refVideo = '' } = req.body || {};

    if (!target || !message || !hook) {
        return res.status(400).json({ error: 'Thiếu các trường bắt buộc: target, message, hook' });
    }

    // 2. Input Sanitization & Length Guard (Chống Prompt Injection & Token Bloat)
    target = String(target).trim().slice(0, 500);
    apartment = String(apartment || 'Căn hộ 2 Phòng Ngủ').trim().slice(0, 100);
    message = String(message).trim().slice(0, 1000);
    hook = String(hook).trim().slice(0, 500);
    duration = String(duration || '45-60 giây').trim().slice(0, 50);
    refScript = String(refScript).trim().slice(0, 3000);
    refVideo = String(refVideo).trim().slice(0, 300);

    // 3. Response Cache Check (Tiết kiệm 100% Token cho request trùng lặp)
    const cacheKey = `${target}|${apartment}|${message}|${hook}|${duration}|${refScript.slice(0, 100)}`;
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return res.status(200).json({
            result: cached.result,
            modelUsed: `${cached.modelUsed} (Bộ nhớ đệm tốc độ cao - 0 Token)`,
            engine: cached.engine,
            cached: true,
            candidates: [{ content: { parts: [{ text: cached.result }] } }]
        });
    }

    // SERVER-SIDE OFFICIAL DATA & NEGATIVE RULES FOR PENINSULA PRIVATE DA NANG
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

    // 4. Single-Pass High-Efficiency Master Prompt (Gộp 2 bước thành 1 - Tiết kiệm 50% Token)
    const masterSystemPrompt = 
        `Ban la Giam doc Sang tao (Creative Director) kiem Chuyen gia Tam ly hoc HNWIs ve Bat Dong San Sieu Sang tai Viet Nam.\n\n` +
        `NHIỆM VỤ:\n` +
        `Từ thông tin chiến dịch, hãy tự động nhận diện tệp khách hàng thuộc nhóm nào (Đầu tư cho thuê, Đầu tư tích sản/mua sỉ, Mua ở nội đô, Khách xa quê, Khách lưu trú Second Home) và trực tiếp tạo ra BẢNG KỊCH BẢN STORYBOARD 4 GIAI ĐOẠN (5 đến 8 phân cảnh) cho GIAI ĐOẠN 1: MỞ BOOKING ĐỢT 1.\n\n` +
        `CẤU TRÚC 4 GIAI ĐOẠN BẮT BUỘC:\n` +
        `1. [GIAI ĐOẠN 1: HOOK & NỖI ĐẦU] [0:00 - 0:06]: Chạm vào tử huyệt cảm xúc/nỗi đau/sự tò mò, ngắt nhịp cuộn Meta (Pattern Interrupt).\n` +
        `2. [GIAI ĐOẠN 2: BỐI CẢNH & GIẢI PHÁP] [0:06 - 0:20]: Tâm điểm Đà Nẵng Downtown kề sông Hàn 65tr/m2, Flycam mảnh đất trống + 3D Render tháp 39 tầng cao 149.8m.\n` +
        `3. [GIAI ĐOẠN 3: CẢM XÚC SỞ HỮU & TÀI CHÍNH] [0:20 - 0:45]: Bàn giao cao cấp cản UV cách âm, Voucher đặt chỗ đến 50 triệu, Booking giảm 3%, Thân thiết giảm 2%, Mua sỉ giảm thêm 1.5% - 2%.\n` +
        `4. [GIAI ĐOẠN 4: CẤP BÁCH & KÊU GỌI HÀNH ĐỘNG] [0:45 - Hết]: Tạo cảm giác cấp bách suất voucher ưu tiên chọn căn đẹp đợt 1, thúc đẩy Gọi Hotline/Đăng ký.\n\n` +
        `QUY TẮC BỐI CẢNH BẮT BUỘC:\n` +
        `- CHƯA CÓ NHÀ MẪU & CHƯA CÓ SA BÀN (Hiện tại vị trí dự án chỉ mới là MẢNH ĐẤT TRỐNG kề bên sông Hàn).\n` +
        `- Host đứng quay thực tế tại mảnh đất trống kề bờ sông Hàn view sông Hàn và trung tâm Hải Châu, lồng ghép hiệu ứng Matchmove 3D Render tháp 39 tầng và không gian 3D nội thất.\n` +
        RULE_COMPLIANCE + `\n\n` +
        `YÊU CẦU ĐẦU RA JSON BẮT BUỘC:\n` +
        `Phải xuất kết quả dưới dạng JSON ARRAY gồm 5 đến 8 object. Mỗi object gồm đúng 6 trường:\n` +
        `{"stt": 1, "duration": "[0:00 - 0:06]", "message": "...", "visual": "...", "textOverlay": "...", "vo": "..."}\n` +
        `Chỉ trả về JSON hợp lệ, không giải thích thêm.`;

    let benchmarkInfo = "";
    if (refVideo || refScript) {
        benchmarkInfo = "\n\nMẪU THAM KHẢO HƯỚNG TỚI (BENCHMARK TARGET):\n";
        if (refVideo) benchmarkInfo += `- Link Video Mẫu: ${refVideo}\n`;
        if (refScript) benchmarkInfo += `- Kịch Bản Mẫu Tham Khảo:\n"""\n${refScript}\n"""\n`;
    }

    const userMessage = 
        `DỮ LIỆU DỰ ÁN:\n${DATA_PENINSULA_PRIVATE}\n\n` +
        `<user_campaign_brief>\n` +
        `Loại căn hộ: ${apartment}\n` +
        `Đối tượng mục tiêu: ${target}\n` +
        `Thông điệp chủ đạo: ${message}\n` +
        `Ý tưởng Hook: ${hook}\n` +
        `Thời lượng: ${duration}\n` +
        `${benchmarkInfo}` +
        `</user_campaign_brief>`;

    try {
        const { text, modelName, engine } = await callAIWithCascade(masterSystemPrompt, userMessage, geminiKey, openAiKey);

        // Lưu vào Cache
        responseCache.set(cacheKey, {
            result: text,
            modelUsed: modelName,
            engine: engine,
            timestamp: Date.now()
        });

        // Dọn dẹp cache cũ nếu vượt quá 100 entries
        if (responseCache.size > 100) {
            const oldestKey = responseCache.keys().next().value;
            responseCache.delete(oldestKey);
        }

        return res.status(200).json({ 
            result: text, 
            modelUsed: modelName,
            engine: engine,
            candidates: [{ content: { parts: [{ text: text }] } }] 
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

async function callAIWithCascade(systemPrompt, userMessage, geminiApiKey, openAiApiKey) {
    let lastError = null;

    // =========================================================================
    // TẦNG 1: THỬ CHATGPT (CÓ CIRCUIT BREAKER BẢO VỆ)
    // =========================================================================
    const now = Date.now();
    const isCircuitOpen = openaiCircuit.isOpen && now < openaiCircuit.openUntil;

    if (openAiApiKey && !isCircuitOpen) {
        const openAiModels = [
            { name: 'gpt-4o', label: 'OpenAI ChatGPT (GPT-4o Flagship)' },
            { name: 'o3-mini', label: 'OpenAI ChatGPT (o3-mini Reasoning)' },
            { name: 'gpt-4o-mini', label: 'OpenAI ChatGPT (GPT-4o Mini)' }
        ];

        for (const m of openAiModels) {
            try {
                const resText = await callOpenAISingle(systemPrompt, userMessage, openAiApiKey, m.name);
                return { text: resText, modelName: m.label, engine: 'openai' };
            } catch (err) {
                lastError = err;
                const errStr = String(err.message).toLowerCase();
                
                // Nếu hết tiền hoặc lỗi quota -> Kích hoạt Circuit Breaker trong 10 phút để ngắt lặp lỗi
                if (errStr.includes('quota') || errStr.includes('credit') || errStr.includes('balance') || errStr.includes('429')) {
                    openaiCircuit.isOpen = true;
                    openaiCircuit.openUntil = Date.now() + 10 * 60 * 1000;
                    openaiCircuit.reason = err.message;
                    console.warn(`[Circuit Breaker Bật] OpenAI hết credits/quota. Tự động chuyển thẳng sang Gemini trong 10 phút.`);
                    break; // Dừng thử các model OpenAI khác ngay lập tức, nhảy sang Gemini
                }
            }
        }
    }

    // =========================================================================
    // TẦNG 2: TỰ ĐỘNG CHUYỂN SANG GOOGLE GEMINI (STRICT JSON MODE)
    // =========================================================================
    if (geminiApiKey) {
        const geminiModels = [
            { name: 'gemini-3.7-flash', thinkingBudget: 4096, label: 'Google Gemini 3.7 Flash (High Reasoning)' },
            { name: 'gemini-3.6-flash', thinkingBudget: 0, label: 'Google Gemini 3.6 Flash' }
        ];

        for (const m of geminiModels) {
            try {
                const resText = await callGeminiSingle(systemPrompt, userMessage, geminiApiKey, m.name, m.thinkingBudget);
                const tag = (openAiApiKey && isCircuitOpen) 
                    ? `${m.label} (Fallback tự động khi ChatGPT hết Credits)` 
                    : m.label;
                return { text: resText, modelName: tag, engine: 'gemini' };
            } catch (err) {
                console.warn(`[Gemini] Model ${m.name} gặp lỗi: ${err.message}.`);
                lastError = err;
            }
        }
    }

    throw new Error(`Tất cả các mô hình AI đều không thể xử lý: ${lastError ? lastError.message : 'Unknown error'}`);
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
    
    const genConfig = { 
        temperature: 0.85, 
        maxOutputTokens: 16384,
        responseMimeType: "application/json" // Strict JSON Mode
    };
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
