import type { Track } from './catalog';

/** Original advanced pilot content; score bands are goals, not calibrated outcomes. */
export const ADVANCED_650_TRACK: Track = {
  "id": "toeic-650-800",
  "title": "Nâng cao",
  "band": "650–800",
  "description": "Paraphrase, ý định người nói, câu dày thông tin và nối bằng chứng giữa các văn bản; nội dung tự biên soạn để luyện chuyên sâu.",
  "units": [
    {
      "id": "c01",
      "title": "Paraphrase và liên kết ý: theo nghĩa, không theo từ",
      "objectives": [
        "Đối chiếu nghĩa thay vì ghép từ giống nhau",
        "Xác định đối tượng của từ thay thế",
        "Giữ đúng phạm vi và điều kiện của thông tin"
      ],
      "prerequisites": [],
      "minutes": 45,
      "knowledge": "Ở mức nâng cao, phương án đúng thường diễn đạt lại ý trong văn bản thay vì lặp nguyên từ. Khi đọc “access will be restricted to staff”, hãy tìm ý “only employees may enter”, không tìm một câu chỉ chứa lại access hoặc staff. Paraphrase có thể thay từ, đổi từ loại, chuyển chủ động sang bị động hoặc biến mệnh đề thành cụm danh từ. Muốn đối chiếu chính xác, cần giữ ba yếu tố: ai thực hiện, việc gì xảy ra và trong điều kiện nào. Câu có cùng chủ đề nhưng đổi một yếu tố vẫn có thể sai.\n\nCác từ thay thế như it, they, this arrangement, the latter hoặc such changes giúp liên kết câu. Hãy tìm danh từ phù hợp về số và nghĩa, rồi thay trực tiếp vào câu để kiểm tra. Danh từ gần nhất không tự động là đối tượng đúng. Trong “The manager approved a revised schedule. This change will reduce congestion”, this change chỉ việc điều chỉnh lịch, không chỉ riêng người quản lý. Một câu sau có thể giải thích lợi ích của quyết định ở câu trước; đọc từng câu tách rời sẽ làm mất quan hệ này.\n\nChú ý giới hạn của thông tin. May là khả năng hoặc sự cho phép, không phải chắc chắn. Until Friday giới hạn thời gian; only for new members giới hạn đối tượng. Phương án bỏ điều kiện thường rộng hơn bằng chứng. Những từ all, never, guaranteed cần bằng chứng tương ứng, không nên chọn chỉ vì nghe dứt khoát. Ngược lại, không loại một phương án chỉ vì dùng từ khác hoàn toàn.\n\nQuy trình luyện: gạch ý nghĩa ngắn của câu nguồn, tìm cách diễn đạt tương đương, rồi kiểm tra chủ thể, thời gian và phạm vi. Với mỗi đáp án sai, hãy nói rõ nó đổi điều kiện nào. Trong lượt tự kiểm tra, che phần giải thích, thử tóm tắt bằng một câu của bạn trước khi xem lựa chọn. Mục tiêu là hiểu quan hệ ý và vận dụng sang đoạn mới, không thuộc cặp từ đồng nghĩa riêng lẻ.",
      "examples": [
        {
          "prompt": "Access is limited to registered visitors. → Only people who have registered may enter.",
          "explanation": "Hai câu giữ cùng điều kiện đăng ký. “Anyone may enter” bỏ điều kiện; “Visitors must register every day” tự thêm tần suất."
        },
        {
          "prompt": "The team postponed the launch. This decision gives testers more time.",
          "explanation": "This decision chỉ việc hoãn ra mắt. Không chọn testers vì họ hưởng lợi từ quyết định, không phải đối tượng được this thay thế."
        }
      ],
      "vocabulary": [
        {
          "word": "be eligible for",
          "meaning": "đủ điều kiện nhận hoặc tham gia",
          "example": "Existing members are eligible for the discount."
        },
        {
          "word": "at no additional charge",
          "meaning": "không thu thêm phí",
          "example": "The guide is available at no additional charge."
        },
        {
          "word": "restricted access",
          "meaning": "quyền truy cập bị giới hạn",
          "example": "The archive has restricted access during maintenance."
        },
        {
          "word": "revised schedule",
          "meaning": "lịch đã điều chỉnh",
          "example": "Please use the revised schedule attached to the email."
        }
      ],
      "reading": "MEMBER UPDATE — NORTHBANK WORKSPACE\nFrom 6 May, members may reserve a quiet room through the online portal rather than asking reception to make the booking. Reservations must be submitted at least one working day before the requested session. Same-day requests will still be handled at reception, subject to room availability.\nThe smaller rooms can be booked for up to two hours. The training room remains available only to organisations that have a corporate membership. This restriction does not apply to the ordinary meeting rooms. All members may continue to use those rooms under the existing conditions.\nEach confirmed reservation includes a projector at no additional charge. However, members who require technical assistance during an event must request it separately. A technician is not automatically assigned when a room is booked.\nWe introduced this arrangement after members reported delays while waiting at the front desk. Existing reservations will not be cancelled or changed. If your account does not yet have portal access, contact reception before attempting your first online booking.",
      "listening": "A: I read the workspace update. Does the online system mean reception will no longer accept bookings?\nB: Not exactly. It handles reservations made at least a working day ahead. We can still ask reception about a room for today, but only if one is free.\nA: Good. I need a projector this afternoon, and I assumed that would cost extra.\nB: The equipment is included. Help from a technician is a separate request, though.\nA: Then I will ask reception whether someone can assist with the connection before I confirm the room.\nB: That sounds sensible. I booked last week, so my existing reservation will stay as it is.",
      "guided": [
        {
          "id": "c01-g1",
          "kind": "knowledge",
          "prompt": "Cách diễn đạt nào giữ đúng nghĩa “may reserve”?",
          "options": [
            "are guaranteed a room",
            "are unable to book",
            "are required to book",
            "are allowed to book"
          ],
          "answer": 3,
          "explanation": "May ở đây là quyền được đặt, không tạo nghĩa bắt buộc hoặc bảo đảm còn phòng."
        },
        {
          "id": "c01-g2",
          "kind": "reading",
          "prompt": "“This restriction” trong thông báo chỉ điều kiện nào?",
          "options": [
            "Reception no longer accepts requests.",
            "Training rooms require corporate membership.",
            "Every room must be booked online.",
            "All members must pay for a projector."
          ],
          "answer": 1,
          "explanation": "Câu ngay trước giới hạn training room cho corporate members; câu sau loại trừ ordinary meeting rooms khỏi giới hạn đó."
        },
        {
          "id": "c01-g3",
          "kind": "listening",
          "prompt": "Vì sao người A định hỏi lễ tân trước khi xác nhận?",
          "options": [
            "To replace a corporate membership.",
            "To pay for a projector.",
            "To check whether technical assistance is available.",
            "To cancel an existing reservation."
          ],
          "answer": 2,
          "explanation": "A nói sẽ hỏi có người giúp kết nối hay không; thiết bị đã được bao gồm."
        }
      ],
      "checkpoint": [
        {
          "id": "c01-c1",
          "kind": "knowledge",
          "prompt": "Phương án nào diễn đạt đúng “at no additional charge”?",
          "options": [
            "charged at the standard hourly rate",
            "included without an extra fee",
            "free only for technicians",
            "available only after a deposit"
          ],
          "answer": 1,
          "explanation": "Cụm này nói không có phí bổ sung; không nêu đặt cọc, nhóm người hay mức giá giờ."
        },
        {
          "id": "c01-c2",
          "kind": "reading",
          "prompt": "Ai vẫn có thể hỏi đặt phòng ngay trong ngày?",
          "options": [
            "Only members whose earlier bookings were cancelled.",
            "Members contacting reception, if a room is available.",
            "Anyone using the portal before midnight.",
            "Only members with a corporate account."
          ],
          "answer": 1,
          "explanation": "Đoạn đầu giữ same-day requests tại reception và kèm điều kiện subject to availability."
        },
        {
          "id": "c01-c3",
          "kind": "reading",
          "prompt": "Điều nào KHÔNG tự đi kèm một lần đặt phòng đã xác nhận?",
          "options": [
            "A technician assigned to the event.",
            "Use of a projector.",
            "Equipment without an additional fee.",
            "The room reservation itself."
          ],
          "answer": 0,
          "explanation": "Thông báo nói technical assistance phải yêu cầu riêng; không tự phân công technician."
        },
        {
          "id": "c01-c4",
          "kind": "listening",
          "prompt": "Người B nói gì về lịch đặt tuần trước của mình?",
          "options": [
            "It has been cancelled.",
            "It will remain unchanged.",
            "It must be moved to the portal.",
            "It now includes a technician."
          ],
          "answer": 1,
          "explanation": "B kết luận existing reservation will stay as it is; không có thay đổi nào khác."
        },
        {
          "id": "c01-c5",
          "kind": "vocabulary",
          "prompt": "Trong ngữ cảnh thông báo, “subject to room availability” nghĩa là gì?",
          "options": [
            "Because every room is permanently reserved.",
            "Only after a room is redecorated.",
            "Depending on whether a room is free.",
            "Regardless of the number of free rooms."
          ],
          "answer": 2,
          "explanation": "Subject to diễn tả điều kiện phụ thuộc, không bảo đảm chắc chắn có phòng."
        }
      ]
    },
    {
      "id": "c02",
      "title": "Ý định người nói và câu trả lời gián tiếp",
      "objectives": [
        "Suy ra ý định từ lượt nói liền kề",
        "Phân biệt từ chối, đề nghị và xác nhận gián tiếp",
        "Loại suy luận hợp lý nhưng không có bằng chứng"
      ],
      "prerequisites": [
        "c01"
      ],
      "minutes": 50,
      "knowledge": "Một câu trả lời gián tiếp thường không chứa yes hoặc no. Khi được hỏi “Can you cover the desk at noon?”, người nghe có thể đáp “My client call ends at twelve thirty”. Câu này cung cấp trở ngại về thời gian, nên hàm ý người đó chưa thể nhận việc lúc mười hai giờ. Không suy ra rằng họ không bao giờ giúp được hoặc đã đồng ý bắt đầu ngay. Suy luận đúng phải vừa đủ để giải thích chức năng của lời nói trong cuộc trao đổi.\n\nĐể hiểu một câu được trích dẫn, đọc hoặc nghe cả lượt trước và lượt sau. “That would save us another trip” có thể là tán thành một đề nghị gộp hai công việc; tự nó không phải lời hứa người nói sẽ lái xe. Hãy tự hỏi: người kia vừa yêu cầu gì, thông tin này giải quyết yêu cầu theo hướng nào, và phản hồi tiếp theo có xác nhận cách hiểu ấy không? Ý định thường là giải thích khó khăn, đề nghị thay thế, nhắc việc hoặc lịch sự từ chối.\n\nTrong email, mức độ cam kết cũng quan trọng. “We could arrange a remote demonstration” là đề xuất; “We have arranged it” là việc đã hoàn tất. Một lời đề nghị có điều kiện không chứng minh người nhận đã chấp thuận. Đừng biến thiện chí thành một quyết định chắc chắn. Các phương án sai thường giữ đúng chủ đề nhưng đổi trạng thái từ đang cân nhắc sang đã xác nhận, hoặc gán việc cho sai người.\n\nKhi luyện, ghi một nhãn chức năng ngắn trước khi xem lựa chọn: từ chối lúc này, đề nghị giờ khác, xin xác nhận. Sau đó đối chiếu với hành động cụ thể trong đoạn. Nếu cần hai hoặc ba giả định ngoài lời nói mới bảo vệ được đáp án, suy luận ấy quá xa. Với câu hỏi trực tiếp về một chi tiết, ưu tiên thông tin được nêu rõ thay vì tìm ý nghĩa ẩn. Kỹ năng nâng cao không có nghĩa mọi câu đều cần suy luận.",
      "examples": [
        {
          "prompt": "“Could you inspect the room now?” — “The supplier is waiting for me downstairs.”",
          "explanation": "Người đáp nêu một việc đang cần xử lý, hàm ý chưa tiện đi ngay. Không đủ bằng chứng để kết luận họ hủy việc kiểm tra hoàn toàn."
        },
        {
          "prompt": "“If Wednesday is difficult, we could meet online on Thursday.”",
          "explanation": "Đây là phương án thay thế có điều kiện. “The meeting has moved to Thursday” mạnh hơn bằng chứng vì người nhận chưa đồng ý."
        }
      ],
      "vocabulary": [
        {
          "word": "make an exception",
          "meaning": "cho phép ngoại lệ",
          "example": "We cannot make an exception without written approval."
        },
        {
          "word": "prior commitment",
          "meaning": "việc đã cam kết trước",
          "example": "She has a prior commitment on Wednesday."
        },
        {
          "word": "tentative arrangement",
          "meaning": "sắp xếp tạm thời, chưa chốt",
          "example": "The tentative arrangement depends on the client."
        },
        {
          "word": "confirm availability",
          "meaning": "xác nhận có thể tham gia hoặc còn chỗ",
          "example": "Please confirm your availability before we book the room."
        }
      ],
      "reading": "EMAIL EXCHANGE — EQUIPMENT DEMONSTRATION\nFrom: Lena Ortiz, Rivergate Supplies\nTo: Haru Kim, Elm Design\nWe can bring the portable printer to your office on Wednesday morning. A demonstration normally takes forty minutes, and we would need access to a table near a power outlet. Please let me know whether 10:00 would be convenient. If your team cannot meet then, we could arrange a remote demonstration on Thursday afternoon instead.\nReply from Haru Kim:\nWednesday is our monthly stock check, and the team will be moving between the storage area and the main office until noon. It would be difficult to have everyone in one place at 10:00. The remote option sounds more practical. Could you send two possible times for Thursday? Our operations manager would also like to join, so I need to check her calendar before confirming.\nFollow-up from Lena:\nI can offer 14:00 or 15:30. I will hold both temporarily until tomorrow morning. Please note that holding a time does not create a confirmed booking.",
      "listening": "A: Could we use the large meeting room for the printer demonstration on Wednesday?\nB: The stock-check team has already reserved it for the whole morning.\nA: I see. Maybe we should accept the supplier's online option instead.\nB: That would save us from moving the equipment, too. Have they given us a time?\nA: Two choices, but neither is confirmed. I need to ask our operations manager which one she can attend.\nB: Her client visit ends at two, so the later session might work better. You should still check with her, though.\nA: I will do that before I reply to the supplier tomorrow morning.",
      "guided": [
        {
          "id": "c02-g1",
          "kind": "knowledge",
          "prompt": "“The stock-check team has already reserved it” có chức năng gì khi đáp lời xin phòng?",
          "options": [
            "Explaining why the room cannot be used then.",
            "Confirming that stock checking is finished.",
            "Agreeing to prepare the room.",
            "Asking the supplier to cancel all demonstrations."
          ],
          "answer": 0,
          "explanation": "Lượt trước hỏi dùng phòng, lượt đáp nêu phòng đã được đặt; đó là trở ngại trực tiếp."
        },
        {
          "id": "c02-g2",
          "kind": "reading",
          "prompt": "Vì sao Haru chưa xác nhận giờ cho thứ Năm?",
          "options": [
            "The supplier has withdrawn both times.",
            "He needs to check the operations manager’s calendar.",
            "He must first test the printer alone.",
            "He is waiting for a power outlet to be installed."
          ],
          "answer": 1,
          "explanation": "Haru nêu người quản lý muốn tham dự và cần kiểm tra lịch trước khi xác nhận."
        },
        {
          "id": "c02-g3",
          "kind": "listening",
          "prompt": "Người B hàm ý gì qua “That would save us from moving the equipment, too”?",
          "options": [
            "The supplier must move to a new office.",
            "The online option has another practical benefit.",
            "The large room is now available.",
            "The printer demonstration is unnecessary."
          ],
          "answer": 1,
          "explanation": "B đồng tình với online option bằng cách thêm lợi ích không cần di chuyển thiết bị."
        }
      ],
      "checkpoint": [
        {
          "id": "c02-c1",
          "kind": "knowledge",
          "prompt": "Câu nào thể hiện một đề xuất chưa được chấp thuận?",
          "options": [
            "We could arrange a remote demonstration.",
            "We have completed the demonstration.",
            "Your booking is confirmed for Thursday.",
            "The team attended the remote session yesterday."
          ],
          "answer": 0,
          "explanation": "Could arrange trong email đề xuất khả năng; ba câu còn lại mô tả trạng thái đã xác nhận hoặc đã xảy ra."
        },
        {
          "id": "c02-c2",
          "kind": "reading",
          "prompt": "Điều gì ngăn nhóm tập trung lúc 10:00 thứ Tư?",
          "options": [
            "They will all be visiting the supplier.",
            "The office has no power outlets.",
            "They will be moving between work areas for a stock check.",
            "The demonstration requires more than a full morning."
          ],
          "answer": 2,
          "explanation": "Haru nêu nhóm di chuyển giữa kho và văn phòng cho stock check; thời lượng chuẩn chỉ 40 phút."
        },
        {
          "id": "c02-c3",
          "kind": "reading",
          "prompt": "Lena nói gì về việc giữ hai khung giờ?",
          "options": [
            "Both sessions must be paid for immediately.",
            "The temporary hold is not a confirmed booking.",
            "The times are held until the end of Thursday.",
            "Only one person may attend each session."
          ],
          "answer": 1,
          "explanation": "Follow-up nói hold đến sáng mai và nhấn mạnh chưa tạo confirmed booking."
        },
        {
          "id": "c02-c4",
          "kind": "listening",
          "prompt": "Vì sao khung giờ muộn hơn có thể phù hợp hơn?",
          "options": [
            "The supplier will arrive after five.",
            "The manager’s client visit ends at two.",
            "The printer cannot operate before noon.",
            "The stock check continues all Thursday."
          ],
          "answer": 1,
          "explanation": "B nêu client visit kết thúc lúc hai; vẫn yêu cầu kiểm tra lại chứ chưa xác nhận."
        },
        {
          "id": "c02-c5",
          "kind": "listening",
          "prompt": "Người A dự định làm gì trước khi trả lời nhà cung cấp?",
          "options": [
            "Book both sessions permanently.",
            "Cancel the stock-check reservation.",
            "Move the equipment into the large room.",
            "Ask the operations manager which time she can attend."
          ],
          "answer": 3,
          "explanation": "Câu cuối I will do that chỉ việc check with her được nhắc ngay trước."
        }
      ]
    },
    {
      "id": "c03",
      "title": "Theo dõi thay đổi trong hội thoại nhiều người",
      "objectives": [
        "Tách kế hoạch ban đầu khỏi quyết định cuối",
        "Theo dõi người phụ trách và hạn chót",
        "Kết hợp thông tin nói với bảng lịch"
      ],
      "prerequisites": [
        "c02"
      ],
      "minutes": 50,
      "knowledge": "Trong hội thoại công việc, thông tin thường được sửa ngay trong lúc nói. “We planned to start at nine, but the engineer cannot arrive before ten” nêu cả kế hoạch cũ và giới hạn mới. Nếu câu hỏi hỏi lịch cuối cùng, không chọn chín giờ chỉ vì đây là con số đầu tiên. Những tín hiệu như actually, instead, that will not work, in that case hoặc let's keep đánh dấu thời điểm cần cập nhật mô hình sự việc trong đầu.\n\nMột cách ghi chú hiệu quả là dùng ba cột rất ngắn: việc, người, hạn. Chỉ cập nhật chi tiết thay đổi thay vì viết lại mọi lời nói. Khi người thứ ba tham gia, xác định họ cung cấp ràng buộc hay chốt quyết định. Người đề xuất không nhất thiết là người thực hiện. “Could Maya send it?” chưa chứng minh Maya nhận việc; cần nghe Maya đồng ý hoặc người điều phối phân công rõ. Trong lời ghi âm tổng hợp, nhãn A, B, C hỗ trợ theo dõi nội dung nhưng chưa thay thế được bản thu nhiều giọng thật.\n\nBảng hoặc lịch kèm theo có thể chứa mã phòng, thời gian trống hay điều kiện sử dụng. Không tìm một con số được nhắc giống nguyên trong bảng rồi chọn ngay. Kết hợp tất cả ràng buộc: số người, thiết bị, thời gian bắt đầu và thời lượng. Một phòng trống đúng giờ nhưng thiếu sức chứa vẫn không phù hợp. Phương án đúng phải đáp ứng đồng thời các điều kiện liên quan, không chỉ một điều kiện dễ thấy.\n\nKhi chữa bài, dựng lại chuỗi cập nhật theo thứ tự nói. Gạch kế hoạch cũ, ghi quyết định sau cùng và trích câu cho biết ai đồng ý. Nếu câu hỏi hỏi việc tiếp theo của một người, chỉ dùng phần nhiệm vụ của người đó. Đừng nhầm lịch bắt đầu sự kiện với hạn gửi tài liệu. Sau khi hiểu chính xác, mới luyện nghe không dừng; tốc độ không bù được việc theo dõi sai chủ thể hoặc bỏ mất một điều kiện.",
      "examples": [
        {
          "prompt": "“Let us meet at nine.” — “The trainer gets here at ten.” — “Then ten thirty it is.”",
          "explanation": "Giờ chốt là 10:30. Chín giờ là đề xuất cũ; mười giờ là lúc giảng viên đến, không phải giờ họp."
        },
        {
          "prompt": "Room A: 8 seats; Room B: 14 seats. A group of twelve needs one room.",
          "explanation": "Chọn B nếu các điều kiện khác đều đạt. A có thể trống đúng giờ nhưng không đủ chỗ; không được bỏ điều kiện số người."
        }
      ],
      "vocabulary": [
        {
          "word": "make a last-minute change",
          "meaning": "thay đổi sát giờ",
          "example": "We had to make a last-minute change to the venue."
        },
        {
          "word": "take responsibility for",
          "meaning": "chịu trách nhiệm về",
          "example": "Maya will take responsibility for the handouts."
        },
        {
          "word": "subject to confirmation",
          "meaning": "còn chờ xác nhận",
          "example": "The new starting time is subject to confirmation."
        },
        {
          "word": "accommodate a group",
          "meaning": "đủ chỗ hoặc phục vụ một nhóm",
          "example": "The smaller room cannot accommodate a group of twelve."
        }
      ],
      "reading": "TRAINING ROOM BOARD — FRIDAY\nAlder: available 09:00–12:00; eight seats; display screen.\nBirch: available 10:00–13:00; fourteen seats; display screen.\nCedar: available 09:00–11:00; sixteen seats; no display screen.\nRoom reservations must include fifteen minutes before the session for setup. All rooms must be left ready for the next booking at the end of the listed period.\n\nEMAIL FROM THE TRAINING COORDINATOR\nOur twelve new supervisors will attend a ninety-minute workshop on Friday. The trainer uses slides throughout the session, so a display screen is essential. We originally hoped to begin at 09:30, but the trainer's earlier appointment has been extended. She can reach our building at 10:00 and needs fifteen minutes to check the equipment before speaking.\nPlease reserve one suitable room and send the revised invitation by 16:00 on Thursday. The workshop itself should begin as soon as the trainer is ready. Participants should bring their existing handbooks; no new printed books are required. The organiser will supply the slides electronically after the workshop.",
      "listening": "A: We need to update Friday's workshop. The trainer now reaches us at ten and needs fifteen minutes to set up.\nB: Alder is free all morning, but it only seats eight. There are twelve supervisors.\nC: Birch has a screen and fourteen seats. It is free from ten, so setup can begin immediately.\nA: Good. Let us reserve Birch from ten until noon, with the workshop starting at ten fifteen.\nB: I can send the revised invitations this afternoon. Do we need to print more handbooks?\nA: No, everyone should bring the one they already have.\nC: I will confirm the room booking now and check the display connection before Friday.\nB: Then I will wait for your confirmation before sending the invitation.",
      "guided": [
        {
          "id": "c03-g1",
          "kind": "knowledge",
          "prompt": "Khi nghe “originally … but …”, nên làm gì?",
          "options": [
            "Assume the event has been cancelled.",
            "Check whether the later information replaces the earlier plan.",
            "Ignore every detail before the word but.",
            "Always keep the first time mentioned."
          ],
          "answer": 1,
          "explanation": "But thường báo tương phản hoặc cập nhật; phải xem chi tiết sau thay đổi điều gì, không tự bỏ toàn bộ thông tin trước."
        },
        {
          "id": "c03-g2",
          "kind": "reading",
          "prompt": "Phòng nào đáp ứng đủ số người, màn hình và giờ chuẩn bị?",
          "options": [
            "Birch",
            "Alder",
            "Cedar",
            "None of the three rooms."
          ],
          "answer": 0,
          "explanation": "Birch có 14 chỗ, màn hình, trống từ 10 giờ; phù hợp 12 người và setup trước 10:15."
        },
        {
          "id": "c03-g3",
          "kind": "listening",
          "prompt": "Ai sẽ xác nhận việc đặt phòng?",
          "options": [
            "The trainer.",
            "Speaker C",
            "Speaker A",
            "Speaker B"
          ],
          "answer": 1,
          "explanation": "C nói I will confirm the room booking now; B phụ trách gửi lời mời sau khi nhận xác nhận."
        }
      ],
      "checkpoint": [
        {
          "id": "c03-c1",
          "kind": "knowledge",
          "prompt": "Trong “I will wait for your confirmation before sending the invitation”, việc nào phải xảy ra trước?",
          "options": [
            "The handbooks must be reprinted.",
            "The room booking must be confirmed.",
            "The workshop must finish.",
            "The slides must be emailed to participants."
          ],
          "answer": 1,
          "explanation": "Before xác định confirmation đi trước việc gửi invitation; không liên quan thời điểm kết thúc workshop."
        },
        {
          "id": "c03-c2",
          "kind": "reading",
          "prompt": "Workshop nên bắt đầu lúc nào theo email?",
          "options": [
            "10:15",
            "10:00",
            "11:00",
            "09:30"
          ],
          "answer": 0,
          "explanation": "Trainer đến 10:00 và cần 15 phút kiểm tra thiết bị; email yêu cầu bắt đầu ngay khi sẵn sàng."
        },
        {
          "id": "c03-c3",
          "kind": "reading",
          "prompt": "Tại sao Cedar không phù hợp dù đủ chỗ?",
          "options": [
            "It requires a corporate membership.",
            "It allows fewer than twelve people.",
            "It is unavailable before nine.",
            "It has no display screen."
          ],
          "answer": 3,
          "explanation": "Thông báo nói slide cần màn hình, nhưng Cedar không có. Không có thông tin về membership."
        },
        {
          "id": "c03-c4",
          "kind": "listening",
          "prompt": "Điều gì giữ nguyên sau lần đổi lịch?",
          "options": [
            "The event will use Alder.",
            "Participants should bring their existing handbooks.",
            "New books will be printed for everyone.",
            "The workshop will start at nine thirty."
          ],
          "answer": 1,
          "explanation": "A xác nhận everyone should bring the one they already have; các lựa chọn khác là kế hoạch bị thay hoặc không được chấp thuận."
        },
        {
          "id": "c03-c5",
          "kind": "listening",
          "prompt": "Người B sẽ gửi lời mời khi nào?",
          "options": [
            "After receiving confirmation of the room booking.",
            "Before the room is selected.",
            "Only after new handbooks arrive.",
            "After the Friday workshop ends."
          ],
          "answer": 0,
          "explanation": "Câu cuối của B nêu rõ sẽ chờ confirmation rồi mới gửi invitation."
        }
      ]
    },
    {
      "id": "c04",
      "title": "Đọc câu dày thông tin: tách mệnh đề và điều kiện",
      "objectives": [
        "Xác định mệnh đề chính trong câu dài",
        "Phân biệt điều kiện, nhượng bộ và thời hạn",
        "Hiểu nghĩa trước khi chọn dạng ngữ pháp"
      ],
      "prerequisites": [
        "c03"
      ],
      "minutes": 50,
      "knowledge": "Một câu dài có thể chứa nhiều cụm danh từ và mệnh đề phụ nhưng vẫn có một thông điệp chính. Trước hết xác định chủ ngữ và động từ chia chính; tạm đặt các cụm mô tả vào ngoặc. Trong “The equipment ordered by the laboratory, which is expanding this year, will arrive on Monday”, will arrive là vị ngữ chính của equipment. Ordered by the laboratory mô tả thiết bị; which is expanding mô tả laboratory. Không để danh từ gần động từ kéo bạn sang cách hiểu sai về số hoặc chủ thể.\n\nTừ nối quyết định quan hệ nghĩa. Although giới thiệu sự nhượng bộ: hai sự việc trái với điều thường mong đợi nhưng cùng tồn tại. Unless giới thiệu điều kiện phủ định: trừ khi điều kiện xảy ra. Provided that đặt điều kiện cần đáp ứng cho hành động được cho phép. Đừng chọn một từ chỉ vì nó đứng đúng trước mệnh đề; cần thử nói lại quan hệ bằng tiếng Việt đơn giản. Một phương án đúng ngữ pháp nhưng đảo điều kiện vẫn sai trong ngữ cảnh.\n\nPhạm vi của ngoại lệ đặc biệt quan trọng trong chính sách. “Fees are waived for replacements requested within thirty days, provided that the original item is returned” đòi hỏi cả thời hạn và việc trả lại đồ cũ. Đáp ứng một điều kiện không tự làm điều kiện còn lại biến mất. Các cụm no later than, within và after cũng đặt mốc khác nhau. Khi đối chiếu câu hỏi, viết ngắn những điều kiện bắt buộc thành danh sách để tránh đọc sót.\n\nTrong bài hoàn thành câu hoặc đoạn, dự đoán loại thông tin cần điền trước khi nhìn lựa chọn: động từ chính, đại từ quan hệ hay từ nối quan hệ logic. Sau đó đọc lại toàn câu cùng câu trước và sau. Nếu giải thích chỉ nói “vì có từ khóa này” mà không nêu chủ thể hoặc quan hệ nghĩa, lời giải chưa đủ chắc. Luyện độ chính xác trước; chỉ tăng tốc sau khi thường xuyên tách đúng mệnh đề và không bỏ mất điều kiện.",
      "examples": [
        {
          "prompt": "Although the supplier offered a refund, the team chose a replacement.",
          "explanation": "Although nối hai ý nhượng bộ: được hoàn tiền nhưng vẫn đổi hàng. Because sẽ đổi thành nguyên nhân, không phù hợp quan hệ muốn diễn đạt."
        },
        {
          "prompt": "The devices delivered yesterday require inspection.",
          "explanation": "Require là động từ chính của devices số nhiều. Delivered yesterday là cụm mô tả; không chọn requires theo yesterday hoặc dùng delivered như vị ngữ chính thứ hai."
        }
      ],
      "vocabulary": [
        {
          "word": "provided that",
          "meaning": "với điều kiện là",
          "example": "A replacement is free provided that the damaged unit is returned."
        },
        {
          "word": "waive a fee",
          "meaning": "miễn một khoản phí",
          "example": "The company will waive the fee for eligible requests."
        },
        {
          "word": "comply with a requirement",
          "meaning": "tuân thủ một yêu cầu",
          "example": "Every return must comply with the packaging requirement."
        },
        {
          "word": "no later than",
          "meaning": "không muộn hơn",
          "example": "Submit the form no later than Friday."
        }
      ],
      "reading": "REPLACEMENT POLICY — HILLVIEW INSTRUMENTS\nCustomers who receive a faulty measuring device may request a replacement within thirty calendar days of delivery. The replacement itself is free, provided that the faulty device is returned in the protective packaging supplied with the original shipment. A copy of the delivery receipt must accompany the request.\nAlthough minor cosmetic marks do not normally qualify an item for replacement, any damage that prevents accurate measurement will be assessed by our technical team. Customers should describe the problem rather than attempting to repair the device themselves. Items modified by an unauthorised repair service are excluded from this policy.\nRequests submitted after the thirty-day period are considered separately and may involve an inspection fee. This does not mean that every late request will be rejected. Customers will be told about any proposed charge before the inspection begins.\nReturn shipping is arranged by Hillview once the request is approved. Do not send a device to the warehouse before receiving the return label. Approval of a replacement does not extend the warranty period of the original purchase.",
      "listening": "A: Our measuring device arrived twelve days ago, and it no longer gives a stable reading. Can we request a replacement?\nB: Yes, but we need the delivery receipt and the original protective packaging. Did anyone try to repair it?\nA: No. We stopped using it as soon as the readings changed. I only wrote down what happened.\nB: That is helpful. I will submit the description and receipt today. We should not send the device back until the company approves the request and provides a shipping label.\nA: I almost asked the courier to collect it this afternoon.\nB: Let us wait. The policy says Hillview arranges return shipping after approval.",
      "guided": [
        {
          "id": "c04-g1",
          "kind": "knowledge",
          "prompt": "Trong “Devices returned without protective packaging may be refused”, động từ chia chính là gì?",
          "options": [
            "protective",
            "packaging",
            "may be refused",
            "returned"
          ],
          "answer": 2,
          "explanation": "Returned without … mô tả devices; may be refused là vị ngữ chính diễn tả khả năng bị từ chối."
        },
        {
          "id": "c04-g2",
          "kind": "reading",
          "prompt": "Miễn phí đổi thiết bị trong 30 ngày còn phụ thuộc điều kiện nào được nêu?",
          "options": [
            "The return arrives without a receipt.",
            "The customer buys an extended warranty.",
            "The faulty device is returned in the supplied protective packaging.",
            "The customer repairs the device first."
          ],
          "answer": 2,
          "explanation": "Provided that đưa điều kiện bao bì; receipt cũng phải kèm yêu cầu. Không có yêu cầu mua bảo hành."
        },
        {
          "id": "c04-g3",
          "kind": "listening",
          "prompt": "Vì sao hai người chưa gửi máy về ngay?",
          "options": [
            "The device is more than thirty days old.",
            "The courier refuses all measuring devices.",
            "They have already repaired the device.",
            "They must first obtain approval and a return label."
          ],
          "answer": 3,
          "explanation": "B nhắc phải chờ approve và shipping label; máy mới 12 ngày, chưa sửa."
        }
      ],
      "checkpoint": [
        {
          "id": "c04-c1",
          "kind": "knowledge",
          "prompt": "Câu nào dùng “although” đúng quan hệ nhượng bộ?",
          "options": [
            "Although a fee was possible, the customer submitted a late request.",
            "Although a fee was possible, submitting a late request because.",
            "Although a fee was possible the customer to submit a late request.",
            "Although a fee was possible, because the customer submitted a late request."
          ],
          "answer": 0,
          "explanation": "Câu đúng có mệnh đề although và mệnh đề chính hoàn chỉnh. Các câu còn lại thiếu cấu trúc chính hoặc thừa từ nối."
        },
        {
          "id": "c04-c2",
          "kind": "reading",
          "prompt": "Chính sách nói gì về yêu cầu gửi sau 30 ngày?",
          "options": [
            "It must be sent directly to the warehouse.",
            "It automatically receives a new warranty.",
            "It is reviewed separately and may carry an inspection fee.",
            "It is always rejected without review."
          ],
          "answer": 2,
          "explanation": "Đoạn 3 dùng considered separately và may involve; không được đổi may thành always."
        },
        {
          "id": "c04-c3",
          "kind": "reading",
          "prompt": "Việc nào khiến thiết bị bị loại khỏi chính sách này?",
          "options": [
            "Recording the symptoms of a fault.",
            "Stopping use after inaccurate readings appear.",
            "Keeping the original delivery receipt.",
            "Modification by an unauthorised repair service."
          ],
          "answer": 3,
          "explanation": "Đoạn 2 loại items modified by unauthorised repair service; mô tả lỗi và giữ receipt đều phù hợp."
        },
        {
          "id": "c04-c4",
          "kind": "listening",
          "prompt": "Người A đã làm gì khi nhận thấy kết quả đo thay đổi?",
          "options": [
            "Requested a warranty extension.",
            "Repaired it through an outside service.",
            "Stopped using the device and recorded the problem.",
            "Sent it to the warehouse immediately."
          ],
          "answer": 2,
          "explanation": "A nói stopped using … wrote down what happened; các hành động khác không xảy ra."
        },
        {
          "id": "c04-c5",
          "kind": "vocabulary",
          "prompt": "“No later than Friday” yêu cầu điều gì?",
          "options": [
            "The action must happen by Friday at the latest.",
            "The action must never happen on Friday.",
            "Friday is merely an example with no deadline.",
            "The action must happen only after Friday."
          ],
          "answer": 0,
          "explanation": "No later than xác lập hạn muộn nhất; không mang nghĩa after hoặc loại chính ngày đó."
        }
      ]
    },
    {
      "id": "c05",
      "title": "Hai văn bản: nối bằng chứng và giải quyết khác biệt",
      "objectives": [
        "Ghép thông tin theo mã, tên và thời gian",
        "Phân biệt điều kiện ưu đãi với chi phí thực tế",
        "Xác định kết luận cần cả hai văn bản"
      ],
      "prerequisites": [
        "c04"
      ],
      "minutes": 55,
      "knowledge": "Trong bộ hai văn bản, câu trả lời có thể nằm ở quan hệ giữa chúng chứ không nằm trọn trong một đoạn. Một thông báo đưa chính sách, còn email mô tả trường hợp cụ thể. Hãy xác định chức năng của từng văn bản trước: quy định chung, hóa đơn, yêu cầu khách hàng hay phản hồi xác nhận. Sau đó tìm khóa ghép đáng tin như mã đơn hàng, tên gói dịch vụ, ngày mua hoặc tên người. Chỉ giống chủ đề là chưa đủ để chắc chắn hai chi tiết đang nói về cùng một việc.\n\nĐọc câu hỏi để biết cần một nguồn hay hai nguồn. Nếu hỏi khách hàng đã yêu cầu gì, email có thể đủ. Nếu hỏi khách hàng được hưởng ưu đãi nào, phải kiểm tra điều kiện trên thông báo rồi đối chiếu trường hợp trong email. Có thể viết một phép suy luận ngắn: chính sách yêu cầu A và B; trường hợp này có A nhưng không có B; vì vậy không được áp dụng ưu đãi. Không tự bổ sung điều kiện thứ ba chỉ vì nó thường có trong đời thực.\n\nKhi hai văn bản khác nhau, xem ngày và mục đích của mỗi bản. Một lịch sửa đổi mới hơn có thể thay thế lịch cũ, nhưng một email hỏi thay đổi chưa phải quyết định đã chấp thuận. Tìm từ xác nhận như approved, revised, confirmed hoặc câu nêu thay thế rõ. Đừng chọn giờ mới chỉ vì văn bản ấy đứng phía sau trên màn hình. Thứ tự hiển thị không luôn là thứ tự hiệu lực.\n\nCác phương án gây nhiễu thường lấy đúng một nửa bằng chứng: đủ số người nhưng sai loại gói, đúng ngày nhưng đặt quá muộn, hoặc nhầm khoản có trong giá với dịch vụ phải mua thêm. Với đáp án được chọn, hãy chỉ ra câu nguồn cho từng phần. Nếu một kết luận quan trọng không có nguồn hỗ trợ, bỏ nó. Khi luyện tốc độ, giới hạn thời gian tìm bằng chứng nhưng vẫn giữ bước đối chiếu điều kiện; không dựa vào trí nhớ mơ hồ về đoạn trước.",
      "examples": [
        {
          "prompt": "Policy: Free delivery for orders of at least ten units. Order: eight units.",
          "explanation": "Không được suy ra free delivery chỉ vì đây là đơn hàng doanh nghiệp. Trường hợp thiếu điều kiện số lượng; địa chỉ khách hàng không thay điều kiện ấy."
        },
        {
          "prompt": "Email: “Could we move to Monday?” Reply: “Tuesday remains confirmed.”",
          "explanation": "Thứ Ba vẫn có hiệu lực. Câu hỏi xin đổi lịch không phải lịch được duyệt, dù Monday xuất hiện trong email mới."
        }
      ],
      "vocabulary": [
        {
          "word": "qualify for a discount",
          "meaning": "đáp ứng điều kiện giảm giá",
          "example": "Orders placed before noon qualify for the discount."
        },
        {
          "word": "cross-reference",
          "meaning": "đối chiếu giữa các nguồn",
          "example": "Cross-reference the booking number with the invoice."
        },
        {
          "word": "be included in the price",
          "meaning": "được tính trong giá",
          "example": "Basic equipment is included in the price."
        },
        {
          "word": "remain in effect",
          "meaning": "vẫn có hiệu lực",
          "example": "The original payment deadline remains in effect."
        }
      ],
      "reading": "DOCUMENT 1 — HARBOUR EVENTS GROUP OFFER\nGroups booking at least twelve places for a weekday workshop receive a ten-percent reduction on the standard attendance price. The booking must be confirmed seven calendar days before the workshop. Both conditions must be met. The standard price is £80 per person and includes the workshop, materials and a light lunch. Travel and overnight accommodation are not included. Any dietary requirements must be submitted three working days before the event.\n\nDOCUMENT 2 — BOOKING CONFIRMATION, REF HE-418\nTo: Nisha Rao, Atlas Services\nThank you for confirming fourteen places for our workshop on Tuesday, 21 September. Your confirmation was received on Friday, 17 September. Your group will be charged the standard attendance price because the booking was confirmed fewer than seven calendar days before the workshop.\nWe have recorded two vegetarian lunches as requested. All fourteen participants will receive the materials on arrival, and the workshop will begin at 09:30. Please quote reference HE-418 when sending any changes to the participant list. We have not reserved hotel rooms for your group. If you require accommodation information, our reception team can provide a list of nearby hotels.",
      "listening": "A: The workshop confirmation arrived. We booked fourteen people, so I expected the group reduction.\nB: Did we confirm seven days in advance? That is the other condition in the offer.\nA: No. The event is on Tuesday the twenty-first, and our confirmation went through last Friday, the seventeenth.\nB: That explains it. We meet the group-size condition but not the deadline.\nA: At least lunch and materials are included. I also need to organise rooms for the two staff members travelling from Leeds.\nB: The confirmation says no hotel rooms have been reserved. Ask reception for their nearby-hotel list.\nA: I will do that. I will quote HE-418 when I contact them, so they can find our booking.",
      "guided": [
        {
          "id": "c05-g1",
          "kind": "knowledge",
          "prompt": "Một câu hỏi về quyền hưởng ưu đãi cần bước nào?",
          "options": [
            "Assume all business groups receive the same discount.",
            "Read only the total number of participants.",
            "Treat every request as an approved change.",
            "Match the policy conditions to the specific booking details."
          ],
          "answer": 3,
          "explanation": "Quyền hưởng ưu đãi phụ thuộc toàn bộ điều kiện chung và trường hợp cụ thể, thường cần cả hai văn bản."
        },
        {
          "id": "c05-g2",
          "kind": "reading",
          "prompt": "Vì sao nhóm Atlas không được giảm 10%?",
          "options": [
            "The workshop falls on a weekend.",
            "The group has fewer than twelve participants.",
            "The group requested vegetarian lunches.",
            "The confirmation was received less than seven days before the workshop."
          ],
          "answer": 3,
          "explanation": "Nhóm 14 người đủ số lượng và sự kiện thứ Ba, nhưng xác nhận 17/9 cho 21/9 không đủ bảy ngày."
        },
        {
          "id": "c05-g3",
          "kind": "listening",
          "prompt": "Người A dự định liên hệ lễ tân để làm gì?",
          "options": [
            "Order materials for a different event.",
            "Request information about nearby hotels.",
            "Cancel all fourteen workshop places.",
            "Change the workshop to a weekend."
          ],
          "answer": 1,
          "explanation": "A cần chỗ nghỉ cho hai nhân viên Leeds; B đề nghị hỏi danh sách khách sạn và A đồng ý."
        }
      ],
      "checkpoint": [
        {
          "id": "c05-c1",
          "kind": "knowledge",
          "prompt": "Kết luận nào cần thông tin từ cả hai tài liệu?",
          "options": [
            "The workshop begins at 09:30.",
            "The confirmation reference is HE-418.",
            "Two vegetarian lunches have been recorded.",
            "Atlas meets the size condition but misses the advance-confirmation condition."
          ],
          "answer": 3,
          "explanation": "Điều kiện chung ở document 1; số lượng và ngày khách xác nhận ở document 2. Ba chi tiết còn lại đều được nêu riêng trong document 2."
        },
        {
          "id": "c05-c2",
          "kind": "reading",
          "prompt": "Tổng phí tham dự của 14 người theo xác nhận là bao nhiêu?",
          "options": [
            "£960",
            "£1,120",
            "£1,008",
            "£80"
          ],
          "answer": 1,
          "explanation": "Giá chuẩn £80 mỗi người và không được giảm; 14 × 80 = £1,120. £1,008 là mức đã giảm 10% nên sai."
        },
        {
          "id": "c05-c3",
          "kind": "reading",
          "prompt": "Khoản nào nhóm phải tự lo ngoài giá tham dự?",
          "options": [
            "Workshop materials.",
            "Overnight accommodation.",
            "Access to the workshop.",
            "The light lunch."
          ],
          "answer": 1,
          "explanation": "Document 1 loại accommodation; document 2 xác nhận chưa đặt hotel. Các khoản kia đều gồm trong giá."
        },
        {
          "id": "c05-c4",
          "kind": "listening",
          "prompt": "Người B giải thích điều gì về ưu đãi?",
          "options": [
            "Meeting only the group-size condition is insufficient.",
            "Every booking made on Friday receives a reduction.",
            "The minimum group size is fourteen.",
            "Lunch preferences determine the discount."
          ],
          "answer": 0,
          "explanation": "B nhắc còn điều kiện đặt trước bảy ngày; nhóm lớn thôi chưa đủ."
        },
        {
          "id": "c05-c5",
          "kind": "vocabulary",
          "prompt": "“Remain in effect” diễn đạt điều gì?",
          "options": [
            "Continue to apply.",
            "Become more expensive automatically.",
            "Be cancelled without notice.",
            "Apply only to new customers."
          ],
          "answer": 0,
          "explanation": "Cụm này nói quy định hoặc thời hạn tiếp tục có hiệu lực, không tự nói về giá hay đối tượng mới."
        }
      ]
    },
    {
      "id": "c06",
      "title": "Bài tổng hợp: từ bằng chứng đến hành động đúng",
      "objectives": [
        "Tổng hợp điều kiện từ email, bảng và hội thoại",
        "Phân biệt hạn chót, giờ bắt đầu và người thực hiện",
        "Tự giải thích lỗi trước khi tăng tốc"
      ],
      "prerequisites": [
        "c05"
      ],
      "minutes": 55,
      "knowledge": "Bài tổng hợp yêu cầu phối hợp nhiều kỹ năng nhưng vẫn nên giải bằng một quy trình ổn định. Trước tiên xác định loại nhiệm vụ: tìm chi tiết, suy luận, xác định ý định hay quyết định hành động. Với chi tiết, tìm bằng chứng trực tiếp. Với suy luận, chỉ đi thêm một bước được các dữ kiện hỗ trợ. Với hành động, kiểm tra người phụ trách, điều kiện cần có và thứ tự thực hiện. Đừng thay tất cả câu hỏi bằng một cách đoán ý chung.\n\nKhi có bảng thời gian, tách giờ bắt đầu sự kiện khỏi giờ phải đến, hạn gửi danh sách hoặc thời điểm thiết bị sẵn sàng. Một câu hỏi “What should the coordinator do next?” hỏi bước chưa làm, không hỏi việc đã hoàn tất trong email trước. Những từ already, still, before và once giúp xác định trạng thái. Đọc lại động từ của phương án: request khác confirm, collect khác deliver, recommend khác approve. Giữ đúng mức độ chắc chắn khi đối chiếu.\n\nĐể luyện tốc độ, có thể thử một khoảng thời gian ngắn cho bộ câu mới, ghi lại thời gian thực tế rồi chữa kỹ. Không tự coi thời gian gợi ý của bài học là chuẩn thi hoặc điều kiện để đạt một mức điểm. Nếu thường đọc nhanh nhưng bỏ sót điều kiện, giảm tốc ở chỗ chứa ngoại lệ và mốc giờ. Nếu hiểu đúng nhưng tìm bằng chứng quá chậm, luyện đọc lướt tiêu đề và định vị bảng trước khi đọc từng câu.\n\nSau khi nộp, phân loại lỗi thành hiểu từ, bỏ điều kiện, gán sai người, dùng kế hoạch cũ hoặc suy luận quá xa. Tự viết lại một câu giải thích đủ bằng chứng cho mỗi lỗi quan trọng. Trong lần ôn sau, che lời giải và thử dựng lại lý do trước khi chọn. Bộ câu này phục vụ học và tự sửa; nhớ đáp án không chứng minh bạn xử lý được văn bản chưa từng thấy. Muốn đánh giá chuyển giao, cần làm thêm một bộ độc lập trong điều kiện tương đương và đối chiếu cả độ chính xác lẫn cách tìm bằng chứng.",
      "examples": [
        {
          "prompt": "“The coordinator has already submitted the list; the venue is still awaiting the deposit.”",
          "explanation": "Việc tiếp theo liên quan khoản đặt cọc, không phải gửi lại danh sách chỉ vì từ list quen thuộc. Already và still cho biết trạng thái khác nhau."
        },
        {
          "prompt": "Email: arrive 08:45; programme starts 09:00; display test finishes 08:30.",
          "explanation": "Ba mốc có vai trò riêng. Câu hỏi giờ đến dùng 08:45, không chọn 09:00 chỉ vì là giờ bắt đầu chương trình."
        }
      ],
      "vocabulary": [
        {
          "word": "contingency plan",
          "meaning": "phương án dự phòng",
          "example": "Keep a contingency plan in case the delivery is delayed."
        },
        {
          "word": "meet a deadline",
          "meaning": "đáp ứng thời hạn",
          "example": "The team must meet the deadline for the final list."
        },
        {
          "word": "outstanding payment",
          "meaning": "khoản thanh toán còn chưa hoàn tất",
          "example": "The venue contacted us about the outstanding payment."
        },
        {
          "word": "take corrective action",
          "meaning": "thực hiện biện pháp khắc phục",
          "example": "Review the evidence before taking corrective action."
        }
      ],
      "reading": "DOCUMENT 1 — COMMUNITY CAREERS DAY, ORGANISER EMAIL\nThe careers day will take place on Saturday, 8 October. Exhibitors should arrive at 08:45, fifteen minutes before visitors are admitted. We have already sent the venue our list of exhibitors. The venue still needs the final number of lunch orders by noon on Thursday. Please collect that information from your own team and send it to the coordinator, not directly to the venue.\n\nDOCUMENT 2 — VENUE PREPARATION BOARD\nMain hall: display test completed by 08:30; visitor entrance opens at 09:00.\nWest room: suitable for quiet interviews; maximum six people at a time.\nLoading entrance: deliveries accepted 07:30–08:30; after 08:30, use the rear reception desk for small items only.\n\nCoordinator's note: Our brochure shipment is expected at 08:40. The boxes are too large for the small-item desk, so I have asked the supplier to deliver earlier. The supplier has not yet confirmed a revised time. If an earlier delivery is impossible, the brochures will be stored overnight on Friday. Please do not promise exhibitors that a Saturday delivery slot has already been arranged.",
      "listening": "A: Have we sent the exhibitor list to the venue?\nB: Yes, that part is complete. We still need each team's lunch total before Thursday noon.\nC: I will collect our team's numbers today. What is happening with the brochures?\nB: The supplier originally offered eight forty on Saturday, but the loading entrance stops accepting deliveries at eight thirty. I asked for an earlier slot and am waiting for confirmation.\nA: If they cannot change it, can we bring the boxes on Friday and leave them overnight?\nB: Yes, that is our backup plan. I have checked that overnight storage is available.\nC: Then I will not tell our exhibitors that Saturday delivery is confirmed. Please update me when the supplier replies.",
      "guided": [
        {
          "id": "c06-g1",
          "kind": "knowledge",
          "prompt": "Cặp từ nào thể hiện đúng khác biệt về trạng thái?",
          "options": [
            "requested = paid; confirmed = cancelled",
            "requested = asked for; confirmed = definitely agreed",
            "requested = completed; confirmed = rejected",
            "requested = stored; confirmed = collected"
          ],
          "answer": 1,
          "explanation": "Requested là đã yêu cầu nhưng chưa chắc được đồng ý. Confirmed là đã xác nhận; không được dùng hai trạng thái thay nhau."
        },
        {
          "id": "c06-g2",
          "kind": "reading",
          "prompt": "Vì sao giờ giao 08:40 ban đầu không phù hợp?",
          "options": [
            "The visitors do not arrive until 10:00.",
            "Lunch orders close on Friday evening.",
            "The west room has only six seats.",
            "Large deliveries are accepted only until 08:30."
          ],
          "answer": 3,
          "explanation": "Board giới hạn loading entrance đến 08:30; hộp quá lớn nên không chuyển sang small-item desk."
        },
        {
          "id": "c06-g3",
          "kind": "listening",
          "prompt": "Người C sẽ làm gì hôm nay?",
          "options": [
            "Send a new exhibitor list directly to the venue.",
            "Confirm the supplier’s Saturday slot.",
            "Collect the team’s lunch numbers.",
            "Move interviews into the main hall."
          ],
          "answer": 2,
          "explanation": "C nói I will collect our team’s numbers today. Danh sách exhibitors đã gửi; lịch giao còn chờ."
        }
      ],
      "checkpoint": [
        {
          "id": "c06-c1",
          "kind": "knowledge",
          "prompt": "Từ “already” trong “We have already sent the list” cho biết điều gì?",
          "options": [
            "The action must happen after the delivery.",
            "The action was explicitly rejected.",
            "The action is complete.",
            "The action has only been proposed."
          ],
          "answer": 2,
          "explanation": "Already cùng have sent đánh dấu việc đã hoàn thành, không phải nhiệm vụ chưa làm."
        },
        {
          "id": "c06-c2",
          "kind": "reading",
          "prompt": "Các nhà triển lãm được yêu cầu đến lúc nào?",
          "options": [
            "07:30",
            "08:30",
            "09:00",
            "08:45"
          ],
          "answer": 3,
          "explanation": "Email yêu cầu arrive 08:45. 08:30 là hạn loading/test, 09:00 mở cửa khách, 07:30 bắt đầu nhận giao."
        },
        {
          "id": "c06-c3",
          "kind": "reading",
          "prompt": "Điều nào có thể kết luận chắc chắn về việc giao brochure vào thứ Bảy?",
          "options": [
            "The supplier has agreed to arrive before 08:30.",
            "The boxes may use the small-item desk at 08:40.",
            "A revised delivery time has been requested but not confirmed.",
            "Overnight storage is unavailable on Friday."
          ],
          "answer": 2,
          "explanation": "Coordinator note nói đã hỏi earlier nhưng supplier chưa confirm. Hộp lớn không dùng small-item desk, storage vẫn là phương án dự phòng."
        },
        {
          "id": "c06-c4",
          "kind": "listening",
          "prompt": "Phương án dự phòng đã được kiểm tra là gì?",
          "options": [
            "Store the brochures overnight on Friday.",
            "Cancel the careers day.",
            "Accept large boxes at the rear desk after 09:00.",
            "Use the west room for unlimited storage."
          ],
          "answer": 0,
          "explanation": "B xác nhận overnight storage available; không có quyết định hủy sự kiện hay đổi quy định delivery."
        },
        {
          "id": "c06-c5",
          "kind": "listening",
          "prompt": "Vì sao C chưa báo rằng lịch giao thứ Bảy đã chốt?",
          "options": [
            "The supplier has not confirmed the earlier time.",
            "The exhibitor list has not been prepared.",
            "Lunch orders have been cancelled.",
            "The main hall cannot be opened on Saturday."
          ],
          "answer": 0,
          "explanation": "C chờ supplier reply vì yêu cầu thay giờ chưa chốt; đây là giữ đúng mức độ chắc chắn của thông tin."
        }
      ]
    }
  ]
};
