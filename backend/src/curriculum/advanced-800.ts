import type { Track } from './catalog';

/** Original advanced pilot material; not ETS content or calibrated score prediction. */
export const ADVANCED_800_TRACK: Track = {
  "id": "toeic-800-plus",
  "title": "Chuyên sâu",
  "band": "800–900+",
  "description": "Rèn ý định tinh tế, đối chiếu nhiều văn bản và xử lý thông tin dày; mục tiêu thiết kế, chưa phải cam kết điểm thi.",
  "units": [
    {
      "id": "d01",
      "title": "Ý định, lời nói giảm và điều kiện ngầm",
      "objectives": [
        "Phân biệt chấp thuận, cân nhắc và từ chối lịch sự",
        "Giữ đúng phạm vi phủ định và điều kiện",
        "Suy luận hành động tiếp theo từ bằng chứng trực tiếp"
      ],
      "prerequisites": [],
      "minutes": 55,
      "knowledge": "Ở mức nâng cao, hiểu nghĩa từng từ chưa đủ để xác định người nói đã đồng ý hay chưa. “We could consider Friday” chỉ mở một khả năng, khác với “Friday is confirmed”. Trước khi chọn đáp án, hãy đánh dấu mức cam kết: đề xuất, dự kiến, có điều kiện hoặc đã xác nhận. Những từ như tentatively, subject to, provided that và pending thường khiến một kế hoạch chưa trở thành cam kết cuối cùng. Không tự bổ sung điều kiện chỉ vì một phương án nghe hợp lý trong đời sống.\n\nLời từ chối lịch sự thường bắt đầu bằng đánh giá tích cực rồi nêu giới hạn quyết định: “The proposal is promising, but we cannot proceed without approval.” Ý quan trọng nằm ở giới hạn sau but, không phải lời khen đầu câu. Khi nghe câu hỏi về ý định, diễn đạt lại hành động mà người nói muốn người khác thực hiện. “Have you seen the queue?” trong bối cảnh thiếu nhân viên có thể là lời nhắc cần hỗ trợ, nhưng chỉ chọn cách hiểu đó khi lượt thoại kế tiếp hoặc hoàn cảnh xác nhận.\n\nPhủ định cũng có phạm vi. “Not all applications were rejected” nghĩa là có ít nhất một hồ sơ không bị từ chối; không chứng minh tất cả đã được duyệt. “We will not charge until the permit is confirmed” đặt một điều kiện trước việc thu phí, không hứa miễn phí vĩnh viễn. Hãy viết lại câu thành hai cột: điều chắc chắn và điều chưa biết. Phương án dùng always, never, all hoặc definitely cần bằng chứng đủ mạnh tương ứng.\n\nQuy trình tự luyện là đọc câu, che bản gốc, nói lại mức cam kết bằng tiếng Việt rồi đối chiếu. Với mỗi phương án sai, chỉ ra nó đã biến khả năng thành sự thật, bỏ điều kiện hay mở rộng phủ định ở đâu. Kiểm tra này tập trung vào suy luận có bằng chứng; nhãn chặng học không xác nhận bạn đã đạt một mức điểm thi.",
      "examples": [
        {
          "prompt": "The supplier has not ruled out a discount, but no revised price has been approved.",
          "explanation": "Nhà cung cấp vẫn để ngỏ khả năng giảm giá; chưa có giá mới được duyệt. “A discount is guaranteed” sai vì đổi khả năng thành cam kết; “The supplier refused any discount” sai vì ruled out đang bị phủ định."
        },
        {
          "prompt": "Not all guests need a printed badge.",
          "explanation": "Ít nhất một số khách không cần thẻ in. Không suy ra không ai cần thẻ; cũng chưa biết nhóm nào được miễn nếu câu không nói thêm."
        }
      ],
      "vocabulary": [
        {
          "word": "subject to approval",
          "meaning": "phụ thuộc vào việc được phê duyệt",
          "example": "The booking is subject to approval by the facilities team."
        },
        {
          "word": "tentatively",
          "meaning": "tạm thời, chưa xác nhận cuối cùng",
          "example": "We have tentatively reserved the smaller room."
        },
        {
          "word": "rule out",
          "meaning": "loại trừ một khả năng",
          "example": "The board has not ruled out a later start."
        },
        {
          "word": "waive a fee",
          "meaning": "miễn một khoản phí",
          "example": "The centre will waive the fee for volunteer training."
        }
      ],
      "reading": "Document 1 — Enquiry, Monday 6 May\nDear Centre Team, Our community group would like to use the courtyard for a careers evening on Friday 24 May. We expect about eighty visitors, including students who may arrive after work. Your online brochure mentions that outdoor events can continue until nine. We would appreciate a provisional reservation while we check the weather and obtain the required permit. Please let us know whether a deposit would be taken immediately. We can bring our own portable display boards, but we would need access to power for two lamps. Regards, Nina.\n\nDocument 2 — Centre reply, Tuesday 7 May\nThank you, Nina. We can hold the courtyard until noon on Thursday 9 May without payment. This hold does not confirm the event. No deposit will be charged until you send the permit and accept the final booking terms. Although the brochure gives a nine o'clock closing time, amplified sound must stop at eight under the current neighbourhood agreement. Your two lamps can use the sockets beside the north entrance. If the event moves indoors, the studio is available for a maximum of fifty people; it is not an equivalent alternative for your current attendance estimate.\n\nDocument 3 — Internal message, Wednesday 8 May\nThe permit office says our application is still being assessed. I have asked the centre whether it could extend the hold by one day, but I have not received agreement. Please do not advertise the courtyard as confirmed yet. We could reduce attendance to fifty if we choose the studio, but that would require a new invitation plan. For now, keep both options open and wait for the centre's response before paying or sending invitations.",
      "listening": "A: The design workshop looks useful, and the supplier has offered us a lower rate if we confirm today. Shall I authorise the payment?\nB: I would not rush into that. The discount is welcome, but the finance director has not approved the additional training budget. Has the supplier said how long the offer can remain open?\nA: Their message says the rate is guaranteed only until five this afternoon. I could ask them to hold it until tomorrow morning.\nB: That would help. Make clear that we are interested, but do not describe the workshop as booked. We also need to know whether the fee includes the practice materials.\nC: I spoke to the supplier yesterday. Printed materials are included, but access to the online exercises costs extra. We have not agreed to buy that access.\nA: Understood. I will request an extension and a separate price for the online exercises. I will wait for budget approval before accepting anything.\nB: Exactly. Please copy me into the reply so I can send the complete figures to the director.",
      "guided": [
        {
          "id": "d01-g1",
          "kind": "knowledge",
          "prompt": "“We could consider Friday” thể hiện mức cam kết nào?",
          "options": [
            "Một lời từ chối mọi ngày khác",
            "Một lịch đã xác nhận",
            "Một khả năng đang được cân nhắc",
            "Một sự kiện đã diễn ra"
          ],
          "answer": 2,
          "explanation": "Could consider mở khả năng; không có từ ngữ xác nhận lịch."
        },
        {
          "id": "d01-g2",
          "kind": "reading",
          "prompt": "Tại thời điểm thông điệp thứ ba, việc gia hạn giữ chỗ đã chắc chắn chưa?",
          "options": [
            "Chưa, nhóm đã hỏi nhưng chưa được trung tâm đồng ý",
            "Rồi, trung tâm đã gia hạn đến thứ Sáu",
            "Không, trung tâm đã từ chối bằng văn bản",
            "Rồi, giấy phép tự động gia hạn giữ chỗ"
          ],
          "answer": 0,
          "explanation": "Thông điệp nói asked ... but ... not received agreement. Chưa có phản hồi không đồng nghĩa đã bị từ chối."
        },
        {
          "id": "d01-g3",
          "kind": "listening",
          "prompt": "Vì sao B chưa muốn A thanh toán ngay?",
          "options": [
            "Nhà cung cấp đã rút ưu đãi",
            "Buổi tập huấn đã bị hủy",
            "Tất cả tài liệu đều phải mua riêng",
            "Ngân sách bổ sung chưa được phê duyệt"
          ],
          "answer": 3,
          "explanation": "B nêu finance director has not approved ... budget; lời khen về ưu đãi không phải chấp thuận trả tiền."
        }
      ],
      "checkpoint": [
        {
          "id": "d01-c1",
          "kind": "knowledge",
          "prompt": "Câu nào diễn đạt đúng “Not all proposals were rejected”?",
          "options": [
            "Tất cả đề xuất đều bị từ chối",
            "Không đề xuất nào được xem xét",
            "Tất cả đề xuất đều được chấp thuận",
            "Ít nhất một đề xuất không bị từ chối"
          ],
          "answer": 3,
          "explanation": "Phủ định all chỉ phủ định việc toàn bộ bị từ chối; không xác định trạng thái mọi đề xuất."
        },
        {
          "id": "d01-c2",
          "kind": "reading",
          "prompt": "Trung tâm sẽ thu tiền đặt cọc sau điều kiện nào?",
          "options": [
            "Nhóm kiểm tra dự báo thời tiết",
            "Nhóm chỉ gửi yêu cầu giữ chỗ",
            "Số người đăng ký đạt tám mươi",
            "Nhóm gửi giấy phép và chấp nhận điều khoản cuối cùng"
          ],
          "answer": 3,
          "explanation": "Document 2 nêu cả permit và accept final booking terms; chỉ một điều kiện riêng chưa đủ."
        },
        {
          "id": "d01-c3",
          "kind": "reading",
          "prompt": "Tại sao studio chưa thể thay thế sân cho kế hoạch hiện tại?",
          "options": [
            "Sức chứa thấp hơn số khách nhóm đang dự kiến",
            "Studio chỉ mở sau chín giờ tối",
            "Studio không có điện",
            "Studio đã được nhóm khác đặt chắc chắn"
          ],
          "answer": 0,
          "explanation": "Nhóm dự kiến 80 khách, nhưng studio tối đa 50 người. Không có thông tin studio thiếu điện hoặc đã kín lịch."
        },
        {
          "id": "d01-c4",
          "kind": "listening",
          "prompt": "A cam kết sẽ làm gì tiếp theo?",
          "options": [
            "Thông báo cho nhân viên lịch đã chốt",
            "Xin kéo dài ưu đãi và hỏi giá riêng cho bài tập trực tuyến",
            "Thanh toán ngay toàn bộ phí",
            "Hủy chương trình vì không có bản in"
          ],
          "answer": 1,
          "explanation": "A nói request an extension and a separate price; đồng thời đợi phê duyệt trước khi chấp nhận."
        },
        {
          "id": "d01-c5",
          "kind": "listening",
          "prompt": "Thông tin nào đã được xác nhận về học liệu?",
          "options": [
            "Công ty không cần tài liệu in",
            "Mọi học liệu đều miễn phí ngoài khóa",
            "Quyền truy cập trực tuyến đã được mua",
            "Tài liệu in đã nằm trong mức phí được báo"
          ],
          "answer": 3,
          "explanation": "C phân biệt printed materials included với online exercises costs extra; quyền truy cập chưa được đồng ý mua."
        }
      ]
    },
    {
      "id": "d02",
      "title": "Paraphrase dày và truy vết tham chiếu",
      "objectives": [
        "Theo dõi một đối tượng qua nhiều cách gọi",
        "Phân biệt điều chỉnh phạm vi và thay đổi toàn bộ",
        "Đối chiếu lượng từ, điều kiện và mốc hiệu lực"
      ],
      "prerequisites": [
        "d01"
      ],
      "minutes": 55,
      "knowledge": "Paraphrase nâng cao không chỉ thay một từ bằng từ đồng nghĩa. Một câu có thể chuyển từ chủ động sang bị động, đổi động từ thành danh từ và tách nguyên nhân khỏi kết quả. Khi đối chiếu câu hỏi với văn bản, hãy giữ một bộ khung gồm người thực hiện, hành động, đối tượng, thời điểm và giới hạn. “The company deferred the launch” có thể được viết lại thành “The release was postponed”; nhưng “the release was cancelled” làm thay đổi trạng thái nên không tương đương.\n\nNhững cụm this arrangement, these items, the latter hoặc the remaining allocation đòi hỏi truy về đối tượng cụ thể. Đừng chọn danh từ gần nhất một cách máy móc. Đọc cả câu trước, xét số ít/số nhiều và xem hành động có phù hợp với đối tượng đó không. Nếu một thông điệp liệt kê máy in và máy quét rồi nói “the latter”, cụm đó chỉ máy quét; nếu sau đó xuất hiện “these devices”, phạm vi có thể bao gồm cả hai. Viết tên đối tượng ra giấy sẽ giảm nhầm khi văn bản liên tục đổi cách gọi.\n\nGiới hạn là phần dễ bị mất khi paraphrase. “Only orders received before noon” không tương đương với mọi đơn hàng trong ngày. “A reduction in the number of deliveries” nói số lần giao giảm, chưa chứng minh lượng hàng mỗi lần giảm. Với con số và thời hạn, tách đơn vị đo khỏi giá trị: ngân sách, tỷ lệ, số chuyến hoặc số kiện. Một đáp án có từ vựng đúng nhưng sai đối tượng đo vẫn sai.\n\nKhi tự chữa, tạo hai dòng: câu gốc và bản diễn đạt lại của bạn. Gạch rõ điều kiện được giữ nguyên bằng lời giải thích, không cần học thuộc cặp từ rời. Sau đó kiểm tra từng phương án sai: nó đổi ai làm, đổi phạm vi, bỏ only hay chuyển việc hoãn thành việc hủy? Tập giải thích sự khác nhau này giúp xử lý văn bản mới tốt hơn việc nhớ vị trí đáp án.",
      "examples": [
        {
          "prompt": "Only the remaining allocation will be carried forward.",
          "explanation": "Chỉ phần phân bổ còn dư được chuyển sang kỳ sau. “The entire budget will be renewed” sai vì đổi phần dư thành toàn bộ và đổi chuyển tiếp thành cấp lại."
        },
        {
          "prompt": "The supplier deferred dispatch of the replacement devices.",
          "explanation": "Nhà cung cấp hoãn việc gửi thiết bị thay thế. Câu không nói hủy đơn hoặc hoãn sửa toàn bộ thiết bị; phải giữ đúng đối tượng replacement devices."
        }
      ],
      "vocabulary": [
        {
          "word": "carry forward",
          "meaning": "chuyển phần còn lại sang kỳ sau",
          "example": "Unused credits can be carried forward for one month."
        },
        {
          "word": "remaining allocation",
          "meaning": "phần phân bổ còn lại",
          "example": "The remaining allocation will cover replacement labels."
        },
        {
          "word": "defer dispatch",
          "meaning": "hoãn gửi hàng",
          "example": "They agreed to defer dispatch until the address was checked."
        },
        {
          "word": "consolidated delivery",
          "meaning": "lần giao gộp nhiều đơn",
          "example": "A consolidated delivery will replace two separate trips."
        }
      ],
      "reading": "Document 1 — Purchasing update\nFrom July, our stationery supplier will combine the Monday and Thursday deliveries into a single Wednesday visit. The change affects routine paper, folders and envelopes; urgent printing materials can still be ordered for next-day delivery at the existing surcharge. Departments should submit routine requests by noon on Tuesday so that purchasing can prepare one consolidated list. This arrangement is intended to reduce vehicle journeys, not to restrict the quantity departments may order. Each department keeps its current monthly allowance, and any unused amount can be carried forward for one month only.\n\nDocument 2 — Department question\nOur reception team has already used sixty pounds of its hundred-pound June allowance. We plan to request twenty pounds of visitor folders on Tuesday 2 July. Does the new delivery arrangement mean our outstanding June balance is lost? We also need special labels for an event on Thursday. Those labels are printing materials, and the supplier has told us they are available. Please confirm which ordering route applies before we send both requests together. We do not want the urgent items held until the following weekly delivery.\n\nDocument 3 — Purchasing clarification\nYour unused June allocation remains available during July, in addition to the normal July allowance. It expires at the end of July if not spent. Put the visitor folders on the routine list before Tuesday noon; they will arrive in Wednesday's consolidated delivery. Submit the special labels separately under the urgent service and include the event date. The surcharge applies to that separate order. This exception does not change the weekly arrangement for ordinary stationery. Please tell the reception team that fewer delivery visits do not mean a lower departmental budget.",
      "listening": "A: I have read the proposal to replace the weekly printed bulletin with an online noticeboard. Are we stopping all printed announcements next month?\nB: Not all of them. The proposal concerns the general bulletin that currently goes to every desk. Safety instructions and notices required by law will remain on paper. Those documents have a different purpose.\nA: So when the email says that these items will continue to be displayed near the entrance, it refers to the safety and legal notices, not the general bulletin?\nB: Correct. The online noticeboard will carry routine news. Staff can choose email alerts for updates, but those alerts will not be switched on automatically.\nC: We should make that distinction clear in the launch message. Several colleagues thought the change meant they would receive more emails every day.\nA: I will revise the message. I will say that alerts are optional and that the printed safety notices remain. When does the change take effect?\nB: On the first Monday next month. Until then, please keep distributing the general bulletin in its current format.",
      "guided": [
        {
          "id": "d02-g1",
          "kind": "knowledge",
          "prompt": "“The release was postponed” tương đương với ý nào?",
          "options": [
            "Sản phẩm đã được phát hành sớm",
            "Ngày phát hành được lùi lại",
            "Sản phẩm chắc chắn bị hủy",
            "Mọi đơn đặt hàng bị từ chối"
          ],
          "answer": 1,
          "explanation": "Postpone là hoãn, chưa phải cancel và không hàm ý đã diễn ra."
        },
        {
          "id": "d02-g2",
          "kind": "reading",
          "prompt": "“This arrangement” ở văn bản 1 chỉ điều gì?",
          "options": [
            "Gộp hai chuyến giao thường lệ thành một chuyến thứ Tư",
            "Hủy mọi đơn hàng khẩn",
            "Giảm ngân sách của từng phòng",
            "Chuyển tất cả hàng đến thứ Hai"
          ],
          "answer": 0,
          "explanation": "Tham chiếu về thay đổi lịch giao ngay trước đó; câu sau nói rõ mục tiêu giảm chuyến xe."
        },
        {
          "id": "d02-g3",
          "kind": "listening",
          "prompt": "“These items” trong email chỉ những tài liệu nào?",
          "options": [
            "Tất cả bản tin chung hàng tuần",
            "Mọi bài đăng trên bảng trực tuyến",
            "Những email thông báo tự động",
            "Hướng dẫn an toàn và thông báo bắt buộc theo luật"
          ],
          "answer": 3,
          "explanation": "A hỏi lại cụ thể hai nhóm tài liệu và B xác nhận; không chỉ bản tin chung."
        }
      ],
      "checkpoint": [
        {
          "id": "d02-c1",
          "kind": "knowledge",
          "prompt": "Bản diễn đạt nào giữ đúng “a reduction in the number of deliveries”?",
          "options": [
            "Tất cả đơn hàng bị giao chậm",
            "Mỗi kiện hàng nhẹ hơn",
            "Có ít lần giao hàng hơn",
            "Ngân sách mua hàng thấp hơn"
          ],
          "answer": 2,
          "explanation": "Đối tượng giảm là số lần giao; lượng hàng, ngân sách hoặc chậm trễ không được khẳng định."
        },
        {
          "id": "d02-c2",
          "kind": "reading",
          "prompt": "Phần ngân sách tháng Sáu còn lại của lễ tân có trạng thái nào?",
          "options": [
            "Bị mất ngay từ ngày 1 tháng Bảy",
            "Được giữ lại không giới hạn thời gian",
            "Có thể dùng trong tháng Bảy rồi hết hạn nếu chưa dùng",
            "Thay thế toàn bộ mức phân bổ tháng Bảy"
          ],
          "answer": 2,
          "explanation": "Văn bản 3 nói phần ngân sách tháng Sáu còn dư dùng được trong tháng Bảy, cộng thêm mức phân bổ tháng Bảy, rồi hết hạn vào cuối tháng nếu chưa dùng."
        },
        {
          "id": "d02-c3",
          "kind": "reading",
          "prompt": "Nhóm lễ tân cần xử lý đơn nhãn đặc biệt thế nào?",
          "options": [
            "Gộp với đơn thường để miễn phụ phí",
            "Đợi chuyến thứ Tư tuần kế tiếp",
            "Gửi riêng theo dịch vụ khẩn và chịu phụ phí",
            "Hủy vì mọi vật tư in đã ngừng cung cấp"
          ],
          "answer": 2,
          "explanation": "Văn bản 3 yêu cầu gửi đơn nhãn riêng theo dịch vụ khẩn và nêu rõ phụ phí áp dụng cho đơn riêng đó."
        },
        {
          "id": "d02-c4",
          "kind": "listening",
          "prompt": "Thông báo khi ra mắt cần làm rõ điều gì?",
          "options": [
            "Tất cả nhân viên tự động nhận email mỗi ngày",
            "Email báo cập nhật là lựa chọn của nhân viên",
            "Bản tin in đã ngừng ngay từ hôm nay",
            "Mọi thông báo an toàn sẽ chuyển lên mạng"
          ],
          "answer": 1,
          "explanation": "B nói thông báo email không tự bật; C nhắc nhiều đồng nghiệp đã hiểu nhầm rằng họ sẽ nhận thêm email mỗi ngày."
        },
        {
          "id": "d02-c5",
          "kind": "listening",
          "prompt": "Trước thứ Hai đầu tiên của tháng sau, A nên làm gì với bản tin chung?",
          "options": [
            "Dán tất cả gần lối vào thay vì phát",
            "Chỉ gửi cho nhân viên đăng ký email",
            "Chuyển ngay toàn bộ lên bảng trực tuyến",
            "Tiếp tục phân phát theo định dạng hiện tại"
          ],
          "answer": 3,
          "explanation": "Ở lượt cuối, B yêu cầu tiếp tục phân phát bản tin theo định dạng hiện tại cho đến thứ Hai đầu tiên của tháng sau. Lịch mới chưa có hiệu lực."
        }
      ]
    },
    {
      "id": "d03",
      "title": "Ba văn bản: phiên bản và chuỗi thời gian",
      "objectives": [
        "Phân biệt đề nghị cũ và lịch được xác nhận mới",
        "Kết hợp thời điểm bắt đầu với thời lượng cần thiết",
        "Truy điều kiện xử lý công việc qua ba văn bản"
      ],
      "prerequisites": [
        "d02"
      ],
      "minutes": 60,
      "knowledge": "Trong bài đọc nhiều văn bản, mỗi tài liệu có thể đúng tại thời điểm được viết nhưng không còn là kế hoạch cuối cùng. Trước khi trả lời, lập một dòng thời gian ngắn: yêu cầu ban đầu, xác nhận, điều chỉnh và phản hồi chốt. Một email đề nghị thay đổi không tự ghi đè lịch đã được xác nhận. Chỉ xem đề nghị đó là có hiệu lực khi có bằng chứng người có thẩm quyền đồng ý hoặc văn bản sau thông báo đã cập nhật.\n\nTách thời điểm đến khỏi thời điểm hoàn thành. Nếu xe tới lúc 14:20 và cần hai mươi phút dỡ hàng, công việc kết thúc sớm nhất lúc 14:40, không phải 14:20. Sau đó so với toàn bộ cửa sổ được phép làm việc. Một lịch hẹn có thời điểm bắt đầu phù hợp vẫn có thể không đủ độ dài. Không tự giả định có thể lấn sang lượt của người khác, bắt đầu trước giờ mở cửa hoặc bỏ qua thời gian chuẩn bị.\n\nKhi có ba văn bản, câu trả lời thường cần hai mảnh bằng chứng: quy định trong bản hướng dẫn và tình trạng thực tế trong email cuối. Hãy ghi nhãn nguồn cho từng kết luận. Ví dụ, “cần đổi lượt” có thể dựa trên lịch bến hàng và thông báo xe chậm; không có tài liệu nào nói nguyên câu đó. Đây là suy luận hợp lệ vì nó dùng những điều đã nêu, không cần đoán thêm hành vi ngoài văn bản.\n\nĐặc biệt chú ý các điều kiện kích hoạt: thanh toán khi có biên bản giao, vào cửa khi có thẻ hoặc khởi công sau khi kiểm tra điện. Giao hàng, lắp đặt và nghiệm thu là ba trạng thái khác nhau. Khi chữa lỗi, chỉ ra phương án đã nhập nhằng hai trạng thái nào. Tự luyện bằng cách giải thích một chuỗi ít nhất hai bước trước khi xem đáp án; nếu không thể nêu bằng chứng cho một bước, giảm mức chắc chắn của kết luận.",
      "examples": [
        {
          "prompt": "Arrival: 14:20. Unloading: 20 minutes. Reserved slot ends: 14:30.",
          "explanation": "Dỡ hàng kết thúc sớm nhất lúc 14:40, vượt cuối lượt mười phút. Có mặt trước 14:30 không có nghĩa toàn bộ công việc nằm trong lượt. Không được tự giả định có quyền lấn giờ."
        },
        {
          "prompt": "An invoice can be processed upon receipt of the signed delivery record.",
          "explanation": "Biên bản giao có chữ ký là điều kiện xử lý hóa đơn. Không đổi thành “chỉ sau khi mọi thiết bị hoạt động” nếu văn bản chưa đặt điều kiện nghiệm thu đó."
        }
      ],
      "vocabulary": [
        {
          "word": "allocated time slot",
          "meaning": "khung thời gian được phân",
          "example": "Unloading must finish within the allocated time slot."
        },
        {
          "word": "signed delivery record",
          "meaning": "biên bản giao hàng có chữ ký",
          "example": "Attach the signed delivery record to the invoice."
        },
        {
          "word": "supersede",
          "meaning": "thay thế phiên bản hoặc quyết định trước",
          "example": "The confirmed schedule supersedes the earlier proposal."
        },
        {
          "word": "subject to availability",
          "meaning": "tùy tình trạng còn chỗ hoặc nguồn lực",
          "example": "A later slot is subject to availability."
        }
      ],
      "reading": "Document 1 — Exhibition planning email, Monday 24 June\nOur client demonstration opens at ten on Friday 28 June, with a staff rehearsal at nine thirty. Please deliver the display equipment on Thursday 27 June rather than on the event morning. Everything should be inside the hall by four on Thursday so that the technical team has time to test it. The supplier's invoice can be processed once reception receives the signed delivery record. Final technical testing is a separate task and is not a condition for processing that invoice. Please confirm both the vehicle arrival time and the unloading slot.\n\nDocument 2 — Loading dock confirmation, Tuesday 25 June\nThe supplier has been assigned Thursday's slot from two until two thirty. Unloading normally requires twenty minutes and must be completed within the assigned slot because another vehicle uses the dock afterwards. Drivers may wait in the holding area, but they may not block the dock. A slot from two thirty until three is still available on request; it will not be reserved automatically. Our electrician is scheduled to attend the hall at three. There is no supplier access through the public event entrance on Friday morning.\n\nDocument 3 — Supplier update, Wednesday 26 June\nThe route has changed, and our earliest arrival on Thursday is now two twenty. We still require the full twenty minutes to unload. Could the coordinator request the later available dock slot for us? We can wait in the holding area until it starts. Once unloading is complete, the equipment can be taken directly into the hall for the electrician. We have not received confirmation of a revised slot yet, so please treat this as a request rather than an agreed change.",
      "listening": "A: The programme shows the panel discussion at eleven, but the speaker's assistant has just called. Her train is now expected at ten forty five, and the station is about twenty minutes away.\nB: That would put her here after eleven even if she leaves the station immediately. Has she agreed to join the first part online?\nA: She is willing to, but the technical team needs fifteen minutes to check her connection before the session. We cannot assume that can happen while she is still travelling.\nC: The workshop scheduled for eleven thirty can start at eleven instead. Its trainer is already here, and the room setup is identical. Moving the panel to eleven thirty would avoid asking the speaker to connect from the train.\nB: That sounds workable, but I need the programme manager's approval before we announce the swap. Please keep the current signs in place until that approval arrives.\nA: I will contact the manager and explain both timings. If the change is approved, I will send one updated programme to all the volunteers.\nC: Good. I will check that the trainer is comfortable with the earlier start, but I will not tell participants the change is final yet.",
      "guided": [
        {
          "id": "d03-g1",
          "kind": "knowledge",
          "prompt": "Một email chỉ nói “Could we move the meeting?” có tự thay lịch đã xác nhận không?",
          "options": [
            "Không bao giờ được thay lịch bằng email",
            "Có, nếu người viết dùng could",
            "Có, mọi email mới nhất đều thay lịch cũ",
            "Không; cần bằng chứng đề nghị đã được chấp thuận"
          ],
          "answer": 3,
          "explanation": "Đây mới là đề nghị. Độ mới của thông điệp không tự tạo ra sự xác nhận."
        },
        {
          "id": "d03-g2",
          "kind": "reading",
          "prompt": "Vì sao xe đến lúc hai giờ hai mươi chưa đáp ứng lượt bến đã phân?",
          "options": [
            "Bến không nhận bất kỳ xe nào trước ba giờ",
            "Lượt bến cũ đã tự động bị hủy",
            "Thợ điện chỉ làm trước hai giờ",
            "Hai mươi phút dỡ hàng sẽ kéo dài quá hai giờ ba mươi"
          ],
          "answer": 3,
          "explanation": "Kết hợp thời điểm đến trong văn bản 3 và thời lượng trong văn bản 2: kết thúc 14:40, vượt 14:30."
        },
        {
          "id": "d03-g3",
          "kind": "listening",
          "prompt": "Vì sao B chưa cho thay ngay các biển chương trình?",
          "options": [
            "Người hướng dẫn chưa tới nơi",
            "Diễn giả đã hủy chuyến đi",
            "Máy in đã hỏng",
            "Cần phê duyệt của người quản lý chương trình"
          ],
          "answer": 3,
          "explanation": "B yêu cầu giữ biển cũ đến khi được duyệt. Đổi lịch vẫn đang là phương án đề xuất."
        }
      ],
      "checkpoint": [
        {
          "id": "d03-c1",
          "kind": "knowledge",
          "prompt": "Kết luận nào đúng khi xe đến 14:20, dỡ 20 phút và lượt kết thúc 14:30?",
          "options": [
            "Xe được tự động lấn sang lượt kế tiếp",
            "Không thể hoàn tất trong lượt nếu không đổi điều kiện",
            "Xe dùng được lượt vì đã đến trước 14:30",
            "Công việc chắc chắn xong trước 14:30"
          ],
          "answer": 1,
          "explanation": "Hai mươi phút kể từ 14:20 dẫn tới 14:40. Không có quyền lấn giờ được nêu."
        },
        {
          "id": "d03-c2",
          "kind": "reading",
          "prompt": "Nếu lượt 14:30–15:00 được chấp thuận, điều gì phù hợp kế hoạch?",
          "options": [
            "Xe đợi ở khu chờ rồi dỡ xong trước giờ thợ điện tới",
            "Thiết bị phải đi qua lối khách sáng thứ Sáu",
            "Hóa đơn phải chờ sau buổi trình diễn",
            "Xe phải rời đi mà không dỡ hàng"
          ],
          "answer": 0,
          "explanation": "Dỡ từ 14:30 trong hai mươi phút kết thúc 14:50, trước thợ điện lúc 15:00. Đây là kết luận có điều kiện."
        },
        {
          "id": "d03-c3",
          "kind": "reading",
          "prompt": "Điều kiện xử lý hóa đơn được nêu là gì?",
          "options": [
            "Khách tham dự đã đến đủ",
            "Lễ tân nhận biên bản giao hàng có chữ ký",
            "Thiết bị vượt kiểm tra kỹ thuật cuối",
            "Lượt bến mới vừa được đề nghị"
          ],
          "answer": 1,
          "explanation": "Văn bản 1 tách biên bản giao hàng khỏi kiểm tra kỹ thuật cuối; không được thay bằng nghiệm thu."
        },
        {
          "id": "d03-c4",
          "kind": "listening",
          "prompt": "Lợi ích chính của phương án đổi hai phiên là gì?",
          "options": [
            "Bảo đảm tàu tới đúng giờ cũ",
            "Bỏ toàn bộ kiểm tra kết nối",
            "Diễn giả có thêm thời gian tới nơi trước phiên thảo luận",
            "Được công bố mà không cần duyệt"
          ],
          "answer": 2,
          "explanation": "Tàu đến 10:45 cộng hai mươi phút di chuyển là 11:05. Phiên 11:30 tạo khoảng đệm, không bảo đảm giờ tàu."
        },
        {
          "id": "d03-c5",
          "kind": "listening",
          "prompt": "A sẽ gửi chương trình cập nhật khi nào?",
          "options": [
            "Sau khi thay biển dù chưa được duyệt",
            "Sau khi phương án đổi lịch được phê duyệt",
            "Ngay khi nghe tin tàu chậm",
            "Sau khi mọi người đã về"
          ],
          "answer": 1,
          "explanation": "A nói if the change is approved. Trước đó A mới liên hệ quản lý để xin phê duyệt."
        }
      ]
    },
    {
      "id": "d04",
      "title": "Hội thoại nhiều người: ai cam kết điều gì?",
      "objectives": [
        "Theo dõi trách nhiệm qua từng lượt thoại",
        "Tách yêu cầu, lời hứa và việc đã hoàn thành",
        "Nhận ra sửa đổi và điều kiện của lời xác nhận"
      ],
      "prerequisites": [
        "d03"
      ],
      "minutes": 60,
      "knowledge": "Hội thoại nhiều người dễ làm người học gán một hành động cho nhầm người. Hãy tạo ba nhãn: người nêu vấn đề, người đưa thông tin và người nhận trách nhiệm. Một người đề xuất “Could someone contact the venue?” chưa tự nhận sẽ gọi; lời đáp “I can do that” mới có thể xác định người nhận nhiệm vụ. Đại từ that cần nối với hành động đang được bàn, không phải mọi công việc xuất hiện trong cuộc nói chuyện.\n\nTiếp theo, phân biệt trạng thái công việc. “I have drafted the message” chỉ nói bản nháp đã có; “I will send it once you approve it” đặt việc gửi trong tương lai có điều kiện. Nếu câu hỏi hỏi điều gì đã xảy ra, không chọn một việc mới được hứa. Nếu hỏi bước tiếp theo của một người, xét lời nhận trách nhiệm gần nhất còn hiệu lực sau các điều chỉnh, chứ không chỉ hành động được nói đầu tiên.\n\nTín hiệu sửa đổi thường nhỏ nhưng quan trọng: actually, instead, on second thought, unless và as long as. Sau actually, một số chi tiết trước có thể bị thay thế, nhưng không nhất thiết toàn bộ kế hoạch bị hủy. Ghi riêng phần giữ nguyên và phần đổi. Ví dụ, đổi người in tài liệu không tự đổi số bản; chuyển thời gian giao không tự miễn phí giao. Không để một sửa đổi lan rộng sang những thông tin không được nhắc tới.\n\nKhi luyện, nghe lần đầu để xác định mục tiêu chung. Lần hai ghi mỗi người một dòng với động từ hành động và trạng thái đã làm hoặc sẽ làm. Sau khi mở bản chép lời, kiểm tra xem bạn có bỏ mất điều kiện hoặc nhầm người nói không. Với giọng tổng hợp một người, đây chủ yếu là luyện nội dung và theo dõi lượt thoại; nó không thay thế bài nghe nhiều giọng tự nhiên trong điều kiện thi thật.",
      "examples": [
        {
          "prompt": "A: I have drafted the invitation. B: Wait for the revised address. A: I will send it after you confirm that.",
          "explanation": "A đã soạn nhưng chưa gửi. That gắn với xác nhận địa chỉ mới. “A has already emailed the guests” sai vì biến bản nháp thành thư đã gửi."
        },
        {
          "prompt": "C: Actually, I can collect the posters. A: Then I will only deliver the leaflets.",
          "explanation": "C nhận lấy áp phích; A chỉ giao tờ rơi. Không giữ nhiệm vụ cũ cho A sau khi phân công đã đổi. Only giới hạn phần việc A nhận."
        }
      ],
      "vocabulary": [
        {
          "word": "take responsibility for",
          "meaning": "nhận trách nhiệm về",
          "example": "Lena will take responsibility for confirming the address."
        },
        {
          "word": "pending confirmation",
          "meaning": "đang chờ xác nhận",
          "example": "The delivery time is pending confirmation."
        },
        {
          "word": "circulate a draft",
          "meaning": "gửi bản nháp cho người liên quan",
          "example": "Please circulate a draft before contacting clients."
        },
        {
          "word": "revise the allocation",
          "meaning": "điều chỉnh phân công hoặc phân bổ",
          "example": "We revised the allocation of tasks after the meeting."
        }
      ],
      "reading": "Document 1 — Team briefing\nThe visitor centre is preparing a new exhibition guide. Omar has written the main text, Lena is checking the historical dates, and Priya is coordinating the print order. Please do not send a file to the printer until Lena has approved the dates and the centre manager has approved the cover. The provisional quantity is six hundred copies. A final quantity will be chosen after schools confirm their bookings. The guide must reach the centre on Monday 15 July; distributing it before then is not required.\n\nDocument 2 — Message from Priya\nThe printer can meet the delivery date if it receives the approved file by noon on Wednesday 10 July. I have asked for prices for six hundred and eight hundred copies but have not placed an order. Since Omar is away on Wednesday, I will send the final file myself once both approvals are in. Lena, please tell me whether the date check will finish on Tuesday. I can then warn the manager if the cover decision needs to be brought forward. Asking for alternative prices does not commit us to the larger quantity.\n\nDocument 3 — Tuesday reply from Lena\nThe dates are checked and approved. I corrected two dates in the version attached to this message, so please use this attachment rather than Monday's file. The manager has asked for one change to the cover and expects to approve it tomorrow morning. Schools have now confirmed their bookings, and the manager has selected eight hundred copies. Priya, please keep the order on hold until the cover approval arrives. I can answer questions about the dates tomorrow, but I will not be sending the file to the printer.",
      "listening": "A: I have prepared the participant list and drafted the reminder email for Friday's training. I was going to send it this morning, but the room has changed.\nB: I will confirm the new room number with the building team. Do we also need to tell the trainer about the change?\nC: I have already spoken to her. She is happy with the new room, provided that a projector is available. I have not checked the equipment yet.\nA: I can do that this afternoon. Once B confirms the room number and I have checked the projector, I will send the reminder to participants.\nB: Good. I had planned to collect the printed workbooks, but the building meeting may run late.\nC: Actually, I can collect them on my way in tomorrow. That will leave you free to deal with the room confirmation.\nB: Thanks. I will contact the building team now and send you both the confirmed room number by lunchtime.\nA: Then I will keep the email as a draft until those checks are complete. The participant list is ready, so no one needs to prepare it again.\nC: Agreed. I will report back tomorrow when the workbooks have been collected.",
      "guided": [
        {
          "id": "d04-g1",
          "kind": "knowledge",
          "prompt": "“I have drafted it; I will send it once you approve” chứng minh điều gì?",
          "options": [
            "Người phê duyệt sẽ gửi thay người nói",
            "Bản nháp đã có nhưng việc gửi vẫn có điều kiện",
            "Thông điệp đã gửi cho mọi người",
            "Mọi nội dung đã được duyệt"
          ],
          "answer": 1,
          "explanation": "Drafted là đã soạn; will ... once đặt việc gửi trong tương lai có điều kiện."
        },
        {
          "id": "d04-g2",
          "kind": "reading",
          "prompt": "Vì sao Priya không nên dùng tệp của thứ Hai?",
          "options": [
            "Tệp cũ không mở được do đổi số bản",
            "Nhà in không nhận tệp thứ Hai",
            "Lena đã sửa hai ngày tháng trong bản thứ Ba",
            "Omar chưa từng viết nội dung"
          ],
          "answer": 2,
          "explanation": "Lena yêu cầu dùng tệp mới vì đã sửa hai ngày tháng, không phải do định dạng tệp."
        },
        {
          "id": "d04-g3",
          "kind": "listening",
          "prompt": "Ai nhận việc lấy giáo trình in theo phân công cuối?",
          "options": [
            "C",
            "B",
            "Người hướng dẫn",
            "A"
          ],
          "answer": 0,
          "explanation": "C nói Actually, I can collect them. B cảm ơn và chuyển sang việc xác nhận phòng; phân công cũ đã thay đổi."
        }
      ],
      "checkpoint": [
        {
          "id": "d04-c1",
          "kind": "knowledge",
          "prompt": "Vì sao không nên gán việc cho người chỉ hỏi “Could someone call the venue?”?",
          "options": [
            "Could luôn chỉ việc quá khứ",
            "Địa điểm không thể liên hệ",
            "Người hỏi luôn bị cấm gọi",
            "Câu hỏi chưa xác định người nhận trách nhiệm"
          ],
          "answer": 3,
          "explanation": "Cần lời nhận nhiệm vụ hoặc phân công rõ. Một yêu cầu chung chưa đủ xác định ai sẽ làm."
        },
        {
          "id": "d04-c2",
          "kind": "reading",
          "prompt": "Đến cuối văn bản thứ Ba, việc gì còn chờ để Priya gửi tệp?",
          "options": [
            "Phê duyệt bìa sau thay đổi quản lý yêu cầu",
            "Chọn số lượng vì trường chưa đăng ký",
            "Duyệt ngày tháng do Lena đã hủy",
            "Soạn nội dung vì Omar chưa viết"
          ],
          "answer": 0,
          "explanation": "Ngày tháng đã được duyệt và số lượng đã chọn là 800 bản. Bìa đang chờ duyệt sáng hôm sau, nên Priya vẫn phải giữ đơn chưa gửi."
        },
        {
          "id": "d04-c3",
          "kind": "reading",
          "prompt": "Ai gửi tệp cuối nếu có đủ phê duyệt?",
          "options": [
            "Priya",
            "Omar",
            "Một trường tham quan",
            "Lena"
          ],
          "answer": 0,
          "explanation": "Priya tự nhận gửi vì Omar đi vắng. Lena cũng nói rõ cô không gửi tệp cho nhà in."
        },
        {
          "id": "d04-c4",
          "kind": "listening",
          "prompt": "Điều gì C đã hoàn thành trước cuộc trao đổi?",
          "options": [
            "Lấy toàn bộ giáo trình in",
            "Nói với người hướng dẫn về phòng mới",
            "Xác nhận số phòng với bộ phận tòa nhà",
            "Kiểm tra máy chiếu"
          ],
          "answer": 1,
          "explanation": "C đã spoke to her; thiết bị chưa kiểm tra, giáo trình sẽ lấy ngày mai, số phòng do B xác nhận."
        },
        {
          "id": "d04-c5",
          "kind": "listening",
          "prompt": "A sẽ gửi email nhắc sau những việc nào?",
          "options": [
            "C chỉ đồng ý lấy giáo trình",
            "B xác nhận số phòng và A kiểm tra máy chiếu",
            "Danh sách người tham dự được làm lại",
            "B vừa hứa liên hệ nhưng chưa có số phòng"
          ],
          "answer": 1,
          "explanation": "A nêu hai điều kiện rõ. Danh sách đã sẵn sàng và không cần làm lại."
        }
      ]
    },
    {
      "id": "d05",
      "title": "Ngữ pháp phức hợp trong mạch thông tin",
      "objectives": [
        "Giải mã điều kiện và giới hạn thay vì dịch từng từ",
        "Đặt câu nối đúng quan hệ nguyên nhân và đối lập",
        "Chọn cấu trúc đúng cả ngữ pháp lẫn nghĩa trong đoạn"
      ],
      "prerequisites": [
        "d04"
      ],
      "minutes": 60,
      "knowledge": "Một câu đúng ngữ pháp vẫn có thể sai với ý của đoạn. Khi làm bài nâng cao, trước hết xác định quan hệ logic cần diễn đạt: nguyên nhân, nhượng bộ, điều kiện, thời gian hay kết quả. Although giới thiệu một mệnh đề đối lập với điều được kỳ vọng; therefore báo kết quả; unless đặt ngoại lệ khiến mệnh đề chính không xảy ra. Không chọn từ nối chỉ vì nó đứng được ở đầu câu hoặc thường đi với một dấu phẩy.\n\nVới unless, thử viết lại bằng if ... not nhưng kiểm tra chủ thể và thời gian. “Unless approval arrives by noon, dispatch will be postponed” nghĩa là nếu chưa có duyệt trước trưa thì việc gửi bị hoãn. Câu không nói được duyệt sớm đồng nghĩa hàng chắc chắn tới trong ngày; còn có thể có các điều kiện khác. Với provided that hoặc only if, xem chúng là điều kiện bắt buộc trong phạm vi văn bản, không mở rộng thành lời hứa về mọi kết quả sau đó.\n\nMệnh đề rút gọn thường làm câu dày hơn: “Orders received after noon” là những đơn được nhận sau trưa, không phải các đơn tự nhận cái gì. Tìm danh từ được bổ nghĩa và xác định chủ động hay bị động. Một cụm đặt sai có thể đổi người chịu trách nhiệm hoặc khiến người đọc gán hành động cho sai đối tượng. Khi chọn câu chèn vào đoạn, kiểm tra this, these và such có đối tượng tham chiếu rõ, đồng thời câu mới có tiếp nối chủ đề trước và chuẩn bị được câu sau hay không.\n\nCách học là phân tích một ví dụ, che lời giải rồi tự giải thích quan hệ bằng tiếng Việt trước khi chọn từ tiếng Anh. Sau khi làm sai, viết lại cả hai nghĩa mà hai phương án tạo ra. Đừng chỉ ghi “sau although là mệnh đề”: cần nói vì sao đoạn thật sự đang nhượng bộ. Trong bài nghe, áp dụng cùng quy trình với các điều kiện được nói nhanh; dừng và đối chiếu bản chép lời sau lượt luyện, không giả định nghe được từng từ đã đồng nghĩa hiểu quan hệ.",
      "examples": [
        {
          "prompt": "Although demand has increased, the service fee will remain unchanged.",
          "explanation": "Nhu cầu tăng thường khiến ta dự đoán phí tăng, nhưng phí vẫn giữ nguyên: quan hệ nhượng bộ. Therefore báo kết quả nên không giữ ý đối lập đang được diễn đạt."
        },
        {
          "prompt": "Applications submitted after Friday will be reviewed next month.",
          "explanation": "Submitted bổ nghĩa applications với nghĩa bị động: hồ sơ được nộp. Không chọn submitting nếu muốn giữ nghĩa này, vì như vậy hồ sơ bị hiểu là chủ thể đang nộp một thứ khác."
        }
      ],
      "vocabulary": [
        {
          "word": "remain unchanged",
          "meaning": "giữ nguyên",
          "example": "The service fee will remain unchanged this year."
        },
        {
          "word": "provided that",
          "meaning": "với điều kiện là",
          "example": "The extension is available provided that you apply in advance."
        },
        {
          "word": "in the absence of",
          "meaning": "khi không có",
          "example": "In the absence of approval, dispatch will be postponed."
        },
        {
          "word": "be eligible for",
          "meaning": "đủ điều kiện hưởng hoặc tham gia",
          "example": "Orders placed online are eligible for free collection."
        }
      ],
      "reading": "Document 1 — Service policy notice\nAlthough demand for document scanning has increased, the city archive will keep its standard service fee unchanged until the end of the year. Requests received before noon are normally prepared within two working days. This is a preparation target, not a guarantee of postal arrival. Customers may collect completed work at reception without paying a delivery charge. Requests requiring conservation approval cannot enter the scanning queue until that approval is granted, even when the original request was submitted early. Please include a contact number so that staff can clarify incomplete instructions.\n\nDocument 2 — Customer enquiry\nI submitted a request for copies of three old maps at ten on Monday. I understand that early requests are normally prepared within two working days. However, your colleague told me that one map may need a condition check before it can be scanned. Does my early submission mean that the whole order must still be ready by Wednesday? I can collect it rather than have it posted, and I would prefer to receive the two uncomplicated copies first if that is allowed. I have no fixed travel date, so there is no need to arrange an express courier.\n\nDocument 3 — Archive response\nTwo of the maps do not need additional approval. We can prepare those copies separately, and reception will contact you when they are ready. The third map must be approved by the conservation team; the usual preparation period for that item begins only after approval. Your Monday submission does not remove this requirement. Collection is free, but it does not speed up the conservation decision. Please confirm that you accept a split order. Until we receive that confirmation, we will keep your request together rather than produce two separate collections.",
      "listening": "A: We can extend the equipment loan by one week, provided that the borrower submits the request before the original return date. This applicant sent the form yesterday, so the timing requirement is satisfied.\nB: Does that mean I can approve it now?\nA: Not yet. There is a separate requirement: no other customer can have reserved the equipment for the additional week. Please check the booking calendar before you send an approval.\nC: I have just checked. A college has reserved the same projector for the last two days of the requested extension. We could offer an extension of five days instead of seven, but the borrower would need to accept the shorter period.\nB: I will explain that option. Should I say the college reservation has been cancelled?\nC: No, it remains in place. The five-day option avoids a conflict; it does not replace the college booking.\nA: Exactly. Unless the borrower accepts that option, keep the original return date. We should not update the loan record merely because the request was submitted on time.\nB: Understood. I will contact the borrower and wait for a response before changing the record.",
      "guided": [
        {
          "id": "d05-g1",
          "kind": "knowledge",
          "prompt": "Trong “Although demand has increased, the fee remains unchanged”, although diễn đạt gì?",
          "options": [
            "Điều kiện bắt buộc để tăng phí",
            "Hai sự kiện xảy ra hoàn toàn đồng thời",
            "Kết quả thực tế trái với điều thường được kỳ vọng",
            "Phí tăng là kết quả tất yếu"
          ],
          "answer": 2,
          "explanation": "Nhu cầu tăng nhưng phí giữ nguyên là quan hệ nhượng bộ, không phải kết quả hoặc điều kiện."
        },
        {
          "id": "d05-g2",
          "kind": "reading",
          "prompt": "Vì sao yêu cầu nộp sớm không bảo đảm bản đồ thứ ba sẵn sàng vào thứ Tư?",
          "options": [
            "Mọi đơn đều phải gửi bằng bưu điện",
            "Thời gian chuẩn bị chỉ bắt đầu sau phê duyệt bảo tồn",
            "Khách chưa trả phí chuyển phát nhanh",
            "Phí tiêu chuẩn đã tăng từ thứ Hai"
          ],
          "answer": 1,
          "explanation": "Văn bản 1 và 3 đều đặt phê duyệt trước khi vào quy trình quét. Giờ nộp sớm không bỏ điều kiện này."
        },
        {
          "id": "d05-g3",
          "kind": "listening",
          "prompt": "Vì sao gửi đơn đúng hạn chưa đủ để duyệt gia hạn?",
          "options": [
            "Cần kiểm tra thiết bị có bị đặt trước trong tuần thêm không",
            "Trường cao đẳng đã hủy hết lịch",
            "Mẫu đơn luôn phải nộp sau ngày trả",
            "Mọi gia hạn chỉ được ba ngày"
          ],
          "answer": 0,
          "explanation": "A nêu điều kiện thứ hai về lịch đặt. Đúng thời điểm chỉ đáp ứng một trong các yêu cầu."
        }
      ],
      "checkpoint": [
        {
          "id": "d05-c1",
          "kind": "knowledge",
          "prompt": "“Unless approval arrives by noon, dispatch will be postponed” nghĩa là gì?",
          "options": [
            "Nếu chưa có phê duyệt trước trưa thì việc gửi sẽ bị hoãn",
            "Mọi đợt gửi đều bị hủy vĩnh viễn",
            "Nếu duyệt trước trưa thì hàng chắc chắn tới ngay",
            "Phê duyệt sau trưa không bao giờ có giá trị"
          ],
          "answer": 0,
          "explanation": "Unless đặt điều kiện ngoại lệ; câu không bảo đảm thời điểm hàng tới và không nói hủy vĩnh viễn."
        },
        {
          "id": "d05-c2",
          "kind": "reading",
          "prompt": "Khách cần làm gì để nhận hai bản sao trước?",
          "options": [
            "Chỉ đến quầy mà không cần phản hồi",
            "Hủy bản đồ cần bảo tồn",
            "Xác nhận chấp nhận tách đơn",
            "Thuê chuyển phát nhanh ngay"
          ],
          "answer": 2,
          "explanation": "Câu cuối yêu cầu confirmation of split order. Chọn nhận tại quầy không tự tạo sự đồng ý tách đơn."
        },
        {
          "id": "d05-c3",
          "kind": "reading",
          "prompt": "Điều nào đúng về việc nhận trực tiếp tại quầy?",
          "options": [
            "Bảo đảm cả ba bản đồ được duyệt ngay",
            "Không mất phí giao nhưng không thúc đẩy quyết định bảo tồn",
            "Bắt buộc thay mọi thời hạn bằng một ngày",
            "Làm phí dịch vụ quét tăng lên"
          ],
          "answer": 1,
          "explanation": "Văn bản 3 nói collection free và does not speed up conservation decision; hai quá trình độc lập."
        },
        {
          "id": "d05-c4",
          "kind": "listening",
          "prompt": "Vì sao phương án gia hạn năm ngày được đề xuất?",
          "options": [
            "Người mượn đã từ chối mọi gia hạn",
            "Nó xóa luôn đặt chỗ của trường cao đẳng",
            "Nó tránh trùng lịch hai ngày cuối đã có người đặt",
            "Thiết bị chỉ hoạt động thêm được năm ngày"
          ],
          "answer": 2,
          "explanation": "C nói trường đã đặt hai ngày cuối, nên năm ngày tránh xung đột mà vẫn giữ lịch trường."
        },
        {
          "id": "d05-c5",
          "kind": "listening",
          "prompt": "Nếu người mượn chưa chấp nhận phương án ngắn hơn, hồ sơ giữ gì?",
          "options": [
            "Trạng thái đã hủy đặt chỗ trường",
            "Ngày trả ban đầu",
            "Ngày trả sau bảy ngày",
            "Ngày trả sau năm ngày tự động"
          ],
          "answer": 1,
          "explanation": "A nói unless borrower accepts, keep original return date. B chỉ liên hệ, chưa đổi hồ sơ."
        }
      ]
    },
    {
      "id": "d06",
      "title": "Tổng hợp chuyển giao: quyết định dưới giới hạn thời gian",
      "objectives": [
        "Kết hợp quy định, lịch và phản hồi cuối để quyết định",
        "Bảo vệ độ chính xác khi thời gian đọc hữu hạn",
        "Tự phân loại lỗi suy luận thay vì chỉ đếm câu đúng"
      ],
      "prerequisites": [
        "d05"
      ],
      "minutes": 60,
      "knowledge": "Bài tổng hợp cần kiểm tra khả năng vận dụng trên tình huống mới, không chỉ nhớ lại một quy tắc đã gặp. Trước khi mở bài, bạn có thể tự dành sáu phút cho phần đọc và hai lượt nghe cho phần hội thoại. Đây là thời lượng luyện gợi ý, không phải giới hạn được chuẩn hóa hay yêu cầu hệ thống tự chấm tốc độ. Nếu phải đọc lâu hơn, hãy ghi lại phần nào làm bạn chậm để điều chỉnh lượt sau, thay vì đoán hàng loạt nhằm giữ một con số đẹp.\n\nKhi đọc ba văn bản, bắt đầu bằng tên người, mục đích, ngày và điều kiện nổi bật. Sau đó đọc câu hỏi để biết cần tìm chi tiết hay kết hợp thông tin. Với câu suy luận, viết một chuỗi ngắn: quy định yêu cầu gì, tình trạng hiện tại có gì, điều nào còn thiếu. Đáp án đúng thường là kết luận nhỏ nhất được các dữ kiện bảo đảm. Một câu trả lời kể thêm lý do, ý định hoặc kết quả chưa nêu vẫn sai dù phần đầu của nó hợp lý.\n\nQuản lý thời gian không có nghĩa bỏ phần chữa. Sau khi làm, tách lỗi thành bốn nhóm: thiếu từ vựng, hiểu sai cấu trúc, mất mốc hoặc điều kiện, và suy luận vượt bằng chứng. Với lỗi đầu, học từ trong câu; với lỗi cấu trúc, viết lại câu đơn; với lỗi mốc, dựng bảng thời gian; với lỗi suy luận, chỉ ra bước không có nguồn. Cách sửa phải tương ứng nguyên nhân, không chỉ làm lại cùng một lựa chọn đến khi nhớ đáp án.\n\nCuối lượt luyện, che văn bản rồi giải thích quy trình hoặc quyết định chính bằng lời của bạn. Sau khoảng nghỉ, trở lại câu hỏi trước khi xem bài giảng. Tuy nhiên, điểm trên bộ đã gặp phản ánh luyện tập có hỗ trợ, không phải một dự báo điểm TOEIC. Để đánh giá chuyển giao thật, cần câu chưa học và bài kiểm tra độc lập trong điều kiện thống nhất. Bài này chỉ là điểm khởi đầu cho thói quen đó.",
      "examples": [
        {
          "prompt": "Policy: refunds require cancellation at least three working days before departure. Request: submitted two working days before departure.",
          "explanation": "Yêu cầu không đạt điều kiện thời gian của chính sách chuẩn. Không tự kết luận bị từ chối mọi hỗ trợ vì có thể còn ngoại lệ chưa biết; cũng không hứa hoàn tiền nếu văn bản chưa có ngoại lệ."
        },
        {
          "prompt": "A schedule lists the original destination; a later confirmed message names a replacement collection point.",
          "explanation": "Dùng địa điểm thay thế đã được xác nhận. Phương án giữ địa điểm cũ chỉ vì có trong bảng lịch sẽ bỏ mất phiên bản có hiệu lực mới hơn."
        }
      ],
      "vocabulary": [
        {
          "word": "supporting evidence",
          "meaning": "bằng chứng hỗ trợ",
          "example": "Underline the supporting evidence before choosing an inference."
        },
        {
          "word": "meet the eligibility criteria",
          "meaning": "đáp ứng điều kiện xét duyệt",
          "example": "The request must meet the eligibility criteria for a refund."
        },
        {
          "word": "a confirmed amendment",
          "meaning": "điều chỉnh đã được xác nhận",
          "example": "A confirmed amendment changes the collection point."
        },
        {
          "word": "contingency arrangement",
          "meaning": "phương án dự phòng",
          "example": "The team agreed on a contingency arrangement for heavy rain."
        }
      ],
      "reading": "Document 1 — Transport policy\nThe museum provides a shuttle for registered school groups. The standard route leaves Central Station at nine and reaches the museum at nine forty. A group may change its collection point if the transport office confirms the amendment by four on the previous working day. Requests alone do not change the route. Extra luggage must be declared in advance because the shuttle has limited storage. If a group has more than two large equipment cases, it must use a separate delivery service for the additional cases. The museum reception does not arrange that service on the group's behalf.\n\nDocument 2 — Group coordinator's message, Thursday morning\nOur visit is booked for Friday 19 September. Since roadworks affect access to Central Station, could we be collected outside North Library instead? There will be twenty students and two teachers, the same number as originally registered. We will bring three large equipment cases for the demonstration. Please confirm whether the alternative point is possible and whether the cases can travel with us. Our workshop begins at ten, so we need to arrive in time to meet the guide. I can book a separate delivery if necessary, but I need to know before this afternoon.\n\nDocument 3 — Transport office confirmation, Thursday at three\nNorth Library is confirmed as your collection point for tomorrow. The shuttle will leave there at nine ten and arrive at nine fifty. The museum guide has been informed and will meet you at reception at that time. We can carry two large cases only. Please arrange a separate delivery for the third case and send its expected arrival time to reception. Your passenger numbers remain unchanged. This confirmation replaces the station collection details on the original schedule; no further request is needed for the new point.",
      "listening": "A: Before we approve tomorrow's customer visit, can we check the plan one more time? The original message listed a factory tour followed by lunch, but one production area is now closed for maintenance.\nB: The safety officer has confirmed that visitors can still use the other area. We should shorten the tour rather than cancel it. That leaves twenty minutes before lunch.\nC: I can use that time for a product demonstration in the meeting room. The samples are ready, but the room is not yet booked. I need confirmation that it is available.\nA: I will check with reception. If the room is unavailable, could you give the demonstration in the training room instead?\nC: Yes, provided that we can move the samples there before the visitors arrive. They are too heavy to carry through a crowded corridor during the visit.\nB: I can help move them at eight. Please do not promise either room to the customer until reception confirms which one we can use.\nA: Agreed. I will ask reception now, then send a single revised programme showing the shorter tour and the confirmed demonstration location.\nC: Good. Lunch stays at the original time; we are filling the gap, not moving the entire afternoon programme.",
      "guided": [
        {
          "id": "d06-g1",
          "kind": "knowledge",
          "prompt": "Khi gặp một phương án có thêm ý định chưa được văn bản nêu, nên làm gì?",
          "options": [
            "Bỏ qua mọi điều kiện đã đọc",
            "Tự dùng kinh nghiệm để hoàn thiện câu chuyện",
            "Chọn vì đáp án dài thường đủ hơn",
            "Kiểm tra phần suy luận thêm và loại nếu thiếu bằng chứng"
          ],
          "answer": 3,
          "explanation": "Đáp án đúng phải được bằng chứng bảo đảm; tình huống đời thực hợp lý chưa đủ."
        },
        {
          "id": "d06-g2",
          "kind": "reading",
          "prompt": "Văn bản nào quyết định địa điểm đón có hiệu lực cho thứ Sáu?",
          "options": [
            "Chỉ lịch ban đầu ở nhà ga",
            "Yêu cầu buổi sáng dù chưa có phản hồi",
            "Mô tả bất kỳ tuyến xe nào trên chính sách",
            "Xác nhận của văn phòng vận chuyển lúc ba giờ thứ Năm"
          ],
          "answer": 3,
          "explanation": "Xác nhận đến trước hạn bốn giờ và nói thay lịch nhà ga. Yêu cầu đơn thuần chưa có hiệu lực."
        },
        {
          "id": "d06-g3",
          "kind": "listening",
          "prompt": "Điều gì giữ nguyên khi chương trình được điều chỉnh?",
          "options": [
            "Toàn bộ khu sản xuất vẫn mở",
            "Thời lượng chuyến tham quan đầy đủ",
            "Giờ ăn trưa",
            "Phòng trình diễn đã chốt sẵn"
          ],
          "answer": 2,
          "explanation": "C nói lunch stays at original time. Tour ngắn hơn; địa điểm trình diễn vẫn chờ xác nhận."
        }
      ],
      "checkpoint": [
        {
          "id": "d06-c1",
          "kind": "knowledge",
          "prompt": "Sau khi sai do bỏ mất điều kiện hoặc thời điểm, cách chữa phù hợp nhất là gì?",
          "options": [
            "Học thêm từ không liên quan",
            "Chỉ ghi nhớ vị trí đáp án đúng",
            "Làm nhanh hơn mà không xem lời giải",
            "Dựng lại chuỗi điều kiện hoặc bảng thời gian với nguồn chứng minh"
          ],
          "answer": 3,
          "explanation": "Biện pháp chữa cần xử lý đúng nguyên nhân. Lỗi mốc hoặc điều kiện cần tái dựng quan hệ dữ kiện."
        },
        {
          "id": "d06-c2",
          "kind": "reading",
          "prompt": "Nhóm nên có mặt để đón xe ở đâu và lúc nào?",
          "options": [
            "North Library trước giờ khởi hành chín giờ mười",
            "Bảo tàng lúc chín giờ để lên xe",
            "North Library lúc chín giờ năm mươi",
            "Central Station lúc chín giờ"
          ],
          "answer": 0,
          "explanation": "Xác nhận đổi điểm đón sang North Library; xe rời lúc 9:10. Mốc 9:50 là giờ đến bảo tàng, không phải giờ đón."
        },
        {
          "id": "d06-c3",
          "kind": "reading",
          "prompt": "Ai phải tổ chức vận chuyển kiện lớn thứ ba?",
          "options": [
            "Hướng dẫn viên phải hủy đón nhóm",
            "Lái xe phải mang cả ba kiện",
            "Lễ tân bảo tàng tự động đặt hộ",
            "Người điều phối nhóm"
          ],
          "answer": 3,
          "explanation": "Chính sách nói nhóm tự dùng dịch vụ riêng; xác nhận nhắc arrange separate delivery và báo giờ cho lễ tân."
        },
        {
          "id": "d06-c4",
          "kind": "listening",
          "prompt": "Trong trường hợp nào phòng đào tạo có thể dùng để trình diễn?",
          "options": [
            "Nếu phòng họp không có và mẫu được chuyển trước khi khách đến",
            "Bất cứ lúc nào mà không cần xác nhận",
            "Sau bữa trưa dù khách đã rời đi",
            "Chỉ khi toàn bộ chuyến tham quan bị hủy"
          ],
          "answer": 0,
          "explanation": "A đề xuất phương án nếu meeting room unavailable; C thêm điều kiện chuyển mẫu trước khách vì không an toàn khi hành lang đông."
        },
        {
          "id": "d06-c5",
          "kind": "listening",
          "prompt": "Bước tiếp theo A nhận làm là gì?",
          "options": [
            "Yêu cầu mở lại khu đang bảo trì",
            "Hứa ngay cả hai phòng với khách",
            "Hỏi lễ tân rồi gửi chương trình với địa điểm đã xác nhận",
            "Chuyển giờ ăn trưa muộn hơn hai mươi phút"
          ],
          "answer": 2,
          "explanation": "A nhận check reception và sau đó gửi một bản revised programme. Chưa được hứa địa điểm trước khi xác nhận."
        }
      ]
    }
  ]
};
