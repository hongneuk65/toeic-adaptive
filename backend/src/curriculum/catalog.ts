import { ADVANCED_650_TRACK } from './advanced-650';
import { ADVANCED_800_TRACK } from './advanced-800';
/** Original pilot teaching content. Band labels are study goals, not calibrated TOEIC outcomes. */
export interface Question { id: string; kind: 'knowledge' | 'reading' | 'listening' | 'vocabulary'; prompt: string; options: string[]; answer: number; explanation: string; }
export interface Unit { id: string; title: string; objectives: string[]; prerequisites: string[]; minutes: number; knowledge: string; examples: { prompt: string; explanation: string }[]; vocabulary: { word: string; meaning: string; example: string }[]; reading: string; listening: string; guided: Question[]; checkpoint: Question[]; }
export interface Track { id: string; title: string; band: string; description: string; units: Unit[]; }
export const CURRICULUM_TRACKS: Track[] = [
  {
    "id": "foundation",
    "title": "Nền tảng",
    "band": "Kiến thức khởi đầu",
    "description": "Dành cho người cần xây lại câu cơ bản, từ vựng và cách nghe–đọc ngắn trước khi luyện dạng thi.",
    "units": [
      {
        "id": "f01",
        "title": "Câu cơ bản: ai làm gì?",
        "objectives": [
          "Tách chủ ngữ, động từ và tân ngữ",
          "Nhận ra danh từ và động từ trong ngữ cảnh",
          "Đọc thông tin một văn phòng"
        ],
        "prerequisites": [],
        "minutes": 35,
        "knowledge": "Một câu tiếng Anh cơ bản thường cho biết ai hoặc cái gì, rồi nói người hoặc vật đó làm gì. Trong “Mina checks the list”, Mina là chủ ngữ, checks là động từ, the list là tân ngữ. Khi gặp câu dài, trước hết hãy tìm động từ chính và người thực hiện hành động. Các cụm chỉ nơi chốn hoặc thời gian có thể đứng ở đầu hay cuối câu; chúng không tự trở thành chủ ngữ.\n\nDanh từ gọi tên người, vật, nơi hoặc ý tưởng, chẳng hạn clerk, desk, office, plan. Động từ diễn tả hành động hoặc trạng thái, chẳng hạn check, open, be. Một từ có thể có nhiều vai trò: trong “a plan”, plan là danh từ; trong “we plan a trip”, plan là động từ. Vì vậy, không đoán từ loại chỉ bằng bản dịch tiếng Việt. Hãy nhìn từ đứng trước và sau nó. Mạo từ a/an/the thường giúp nhận ra một cụm danh từ.\n\nVới động từ be ở hiện tại, dùng I am, he/she/it is, you/we/they are. Câu “The room is quiet” mô tả trạng thái; không thêm một động từ hành động không cần thiết sau is. Khi đọc thông báo ngắn, xác định người, công việc và địa điểm trước khi dịch từng từ. Khi nghe, thử ghi lại tên người và hành động đầu tiên nghe rõ. Nếu chưa hiểu một từ phụ, vẫn tiếp tục theo dõi ý chính thay vì bỏ cả câu.\n\nTự kiểm tra bằng cách che ví dụ, nói lại ba thành phần của câu, rồi tự đặt một câu mới về việc học của bạn. Sau khi xem đáp án, giải thích vì sao phương án đúng có vai trò phù hợp trong câu.",
        "examples": [
          {
            "prompt": "The assistant prints the report.",
            "explanation": "The assistant là chủ ngữ; prints là hành động; the report là vật được in. Không chọn report làm động từ chỉ vì đây là từ quen thuộc."
          },
          {
            "prompt": "The desks are clean.",
            "explanation": "Desks là danh từ số nhiều, nên dùng are. Clean mô tả tình trạng; câu không cần thêm một động từ hành động."
          }
        ],
        "vocabulary": [
          {
            "word": "assistant",
            "meaning": "trợ lý",
            "example": "The assistant checks the calendar."
          },
          {
            "word": "report",
            "meaning": "báo cáo",
            "example": "The report is on the desk."
          },
          {
            "word": "desk",
            "meaning": "bàn làm việc",
            "example": "My desk is near the door."
          },
          {
            "word": "check",
            "meaning": "kiểm tra",
            "example": "Please check the list."
          }
        ],
        "reading": "Welcome to Oak Office. Mina is the receptionist. She checks the visitor list every morning. The visitor badges are on the front desk. Please leave large bags beside the door.",
        "listening": "Good morning. I am Leo, the office assistant. I prepare the meeting room. The chairs are clean, and the reports are on the table. Please ask Mina for a visitor badge.",
        "guided": [
          {
            "id": "q001",
            "kind": "knowledge",
            "prompt": "Trong “Mina checks the list”, đâu là động từ chính?",
            "options": [
              "Mina",
              "the",
              "checks",
              "the list"
            ],
            "answer": 2,
            "explanation": "Checks diễn tả hành động kiểm tra."
          },
          {
            "id": "q002",
            "kind": "reading",
            "prompt": "Trong bài đọc, Mina làm công việc gì?",
            "options": [
              "Driver",
              "Cook",
              "Accountant",
              "Receptionist"
            ],
            "answer": 3,
            "explanation": "Bài đọc nói trực tiếp “Mina is the receptionist”."
          },
          {
            "id": "q003",
            "kind": "listening",
            "prompt": "Trong bài nghe, Leo chuẩn bị nơi nào?",
            "options": [
              "The meeting room",
              "The kitchen",
              "The garden",
              "The car park"
            ],
            "answer": 0,
            "explanation": "Leo nói “I prepare the meeting room”."
          }
        ],
        "checkpoint": [
          {
            "id": "q004",
            "kind": "knowledge",
            "prompt": "Chọn từ hoàn thành câu: “The reports ___ ready.”",
            "options": [
              "am",
              "are",
              "be",
              "is"
            ],
            "answer": 1,
            "explanation": "Reports là số nhiều, động từ be ở hiện tại là are."
          },
          {
            "id": "q005",
            "kind": "knowledge",
            "prompt": "Trong “Our manager reviews the schedule”, chủ ngữ là gì?",
            "options": [
              "Our manager",
              "reviews",
              "the schedule",
              "schedule"
            ],
            "answer": 0,
            "explanation": "Cụm Our manager chỉ người thực hiện hành động reviews."
          },
          {
            "id": "q006",
            "kind": "reading",
            "prompt": "Theo bài đọc, thẻ khách được đặt ở đâu?",
            "options": [
              "On the front desk",
              "Beside the door",
              "Under the chairs",
              "In the meeting room"
            ],
            "answer": 0,
            "explanation": "Visitor badges are on the front desk; beside the door là chỗ để túi lớn."
          },
          {
            "id": "q007",
            "kind": "listening",
            "prompt": "Theo bài nghe, ai cung cấp thẻ khách?",
            "options": [
              "Mina",
              "A driver",
              "A manager",
              "Leo"
            ],
            "answer": 0,
            "explanation": "Câu cuối yêu cầu hỏi Mina để lấy visitor badge."
          },
          {
            "id": "q008",
            "kind": "vocabulary",
            "prompt": "Trong ngữ cảnh bài này, “report” là gì?",
            "options": [
              "Bàn",
              "Cửa",
              "Ghế",
              "Báo cáo"
            ],
            "answer": 3,
            "explanation": "Report là báo cáo; câu ví dụ đặt nó trên bàn."
          }
        ]
      },
      {
        "id": "f02",
        "title": "Thói quen và giờ làm việc",
        "objectives": [
          "Dùng hiện tại đơn cho lịch thường lệ",
          "Đọc giờ mở cửa và tần suất",
          "Phân biệt does và động từ có -s"
        ],
        "prerequisites": [
          "f01"
        ],
        "minutes": 35,
        "knowledge": "Hiện tại đơn dùng để nói thói quen, thông tin tương đối ổn định và lịch thường lệ. Trong “The shop opens at nine”, giờ mở cửa là lịch được áp dụng đều đặn. Với chủ ngữ he, she, it hoặc danh từ số ít, động từ khẳng định thường thêm -s hoặc -es: works, opens, watches. Với I, you, we, they và danh từ số nhiều, dùng dạng cơ bản: work, open, watch.\n\nTrong câu phủ định, dùng do not hoặc does not rồi giữ động từ chính ở dạng cơ bản. “The shop does not open on Sunday” đúng; “does not opens” sai vì dấu hiệu ngôi đã nằm ở does. Câu hỏi cũng theo nguyên tắc đó: “When does the shop open?” Các từ every day, usually, often và always giúp nhận ra thói quen, nhưng vẫn cần đọc toàn câu vì dấu hiệu thời gian không thay thế việc hiểu nghĩa.\n\nĐọc giờ cần phân biệt thời điểm và khoảng thời gian. “At nine” là lúc chín giờ; “from nine to five” là từ chín đến năm. “Before five” nghĩa là trước năm giờ, không phải đúng năm giờ. Khi nghe lịch làm việc, ghi nhanh tên ngày cùng giờ thay vì cố chép mọi từ. Chú ý các ngoại lệ như except, but, only vì chúng có thể làm thay đổi một ngày trong tuần.\n\nKhi chữa bài, tìm chủ ngữ trước, kiểm tra số ít hay số nhiều, rồi mới chọn dạng động từ. Sau đó đọc lại cả câu để chắc rằng ý nghĩa là một thói quen chứ không phải hành động đang xảy ra. Tự đặt một câu khẳng định và chuyển chính câu đó sang phủ định để kiểm tra quy tắc.",
        "examples": [
          {
            "prompt": "A clerk checks the mail every afternoon.",
            "explanation": "Clerk là số ít; checks thêm -s. Every afternoon diễn tả công việc thường lệ."
          },
          {
            "prompt": "Does the library close at six?",
            "explanation": "Does đã thể hiện ngôi số ít; close giữ dạng cơ bản, không dùng closes sau does."
          }
        ],
        "vocabulary": [
          {
            "word": "weekday",
            "meaning": "ngày trong tuần",
            "example": "The cafe opens early on weekdays."
          },
          {
            "word": "usually",
            "meaning": "thường",
            "example": "I usually study after dinner."
          },
          {
            "word": "close",
            "meaning": "đóng cửa",
            "example": "The library closes at six."
          },
          {
            "word": "except",
            "meaning": "ngoại trừ",
            "example": "We work every day except Sunday."
          }
        ],
        "reading": "Maple Library opens at 8 a.m. on weekdays and at 10 a.m. on Saturday. It closes at 6 p.m. every opening day. The library does not open on Sunday. Members return books at the front desk.",
        "listening": "Hello, this is West Cafe. We serve breakfast from seven to ten on weekdays. On Saturday, breakfast starts at eight. We are closed on Sunday. You can collect online orders at the side counter.",
        "guided": [
          {
            "id": "q009",
            "kind": "knowledge",
            "prompt": "Chọn câu đúng về thói quen.",
            "options": [
              "She check email every morning.",
              "She does checks email every morning.",
              "She checks email every morning.",
              "She checking email every morning."
            ],
            "answer": 2,
            "explanation": "She là chủ ngữ số ít nên dùng checks trong câu khẳng định."
          },
          {
            "id": "q010",
            "kind": "reading",
            "prompt": "Thư viện mở lúc mấy giờ vào ngày thường?",
            "options": [
              "10 a.m.",
              "8 a.m.",
              "6 p.m.",
              "7 a.m."
            ],
            "answer": 1,
            "explanation": "Bài đọc ghi 8 a.m. on weekdays."
          },
          {
            "id": "q011",
            "kind": "listening",
            "prompt": "Quán cafe phục vụ bữa sáng đến mấy giờ vào ngày thường?",
            "options": [
              "Seven",
              "Eight",
              "Ten",
              "Six"
            ],
            "answer": 2,
            "explanation": "Bài nghe nói from seven to ten on weekdays."
          }
        ],
        "checkpoint": [
          {
            "id": "q012",
            "kind": "knowledge",
            "prompt": "Điền từ: “The office does not ___ on Sundays.”",
            "options": [
              "open",
              "opens",
              "opening",
              "opened"
            ],
            "answer": 0,
            "explanation": "Sau does not, dùng động từ nguyên thể không to."
          },
          {
            "id": "q013",
            "kind": "knowledge",
            "prompt": "Câu nào hỏi đúng giờ đóng cửa?",
            "options": [
              "When does the store closes?",
              "When do the store closes?",
              "When does the store close?",
              "When the store close?"
            ],
            "answer": 2,
            "explanation": "Store số ít dùng does; động từ chính giữ close."
          },
          {
            "id": "q014",
            "kind": "reading",
            "prompt": "Ngày nào thư viện không mở cửa?",
            "options": [
              "Sunday",
              "Saturday",
              "Friday",
              "Monday"
            ],
            "answer": 0,
            "explanation": "The library does not open on Sunday."
          },
          {
            "id": "q015",
            "kind": "listening",
            "prompt": "Khách nhận đơn đặt trực tuyến ở đâu?",
            "options": [
              "In the kitchen",
              "At the side counter",
              "At a table",
              "At the front gate"
            ],
            "answer": 1,
            "explanation": "Câu cuối bài nghe chỉ side counter."
          },
          {
            "id": "q016",
            "kind": "vocabulary",
            "prompt": "“Except Sunday” nghĩa là gì?",
            "options": [
              "Sau Chủ nhật",
              "Trước Chủ nhật",
              "Chỉ Chủ nhật",
              "Ngoại trừ Chủ nhật"
            ],
            "answer": 3,
            "explanation": "Except loại trừ một trường hợp khỏi nhóm đang nói."
          }
        ]
      },
      {
        "id": "f03",
        "title": "Hành động đang diễn ra và mô tả tranh",
        "objectives": [
          "Dùng be + V-ing",
          "Phân biệt hành động và vật xuất hiện trong cảnh",
          "Tránh suy đoán vượt điều quan sát được"
        ],
        "prerequisites": [
          "f02"
        ],
        "minutes": 35,
        "knowledge": "Hiện tại tiếp diễn thường mô tả hành động đang xảy ra quanh thời điểm nói. Công thức cơ bản là chủ ngữ + am/is/are + động từ thêm -ing. “A worker is carrying a box” cho biết một công nhân đang mang hộp. “Two workers are carrying boxes” đổi sang are vì chủ ngữ số nhiều. Chỉ có carrying mà thiếu be chưa tạo thành một câu hoàn chỉnh ở cấu trúc này.\n\nKhi gặp mô tả tranh hoặc cảnh làm việc, hãy tách người, vật, hành động và vị trí. Một vật xuất hiện trong cảnh không có nghĩa là ai đó đang sử dụng nó. Có một chiếc ghế không đủ để kết luận người đang ngồi; có máy in không đủ để kết luận nó đang in. Ưu tiên lời mô tả điều quan sát hoặc nghe được, tránh tự thêm mục đích và câu chuyện. Các động từ carry, hold, place, look at có nghĩa khác nhau, dù có thể cùng liên quan đến một vật.\n\nTrạng thái vị trí thường dùng be + giới từ: “The boxes are near the door”. Câu này không nói những chiếc hộp đang di chuyển. Với đồ vật, hãy đọc kỹ khác biệt giữa being moved và simply standing ở các bài nâng cao; ở bài đầu này tập trung chắc vào hành động chủ động và vị trí hiện có.\n\nKhi nghe, nhận ra chủ ngữ số ít hoặc số nhiều, âm của động từ chính và danh từ đi sau. Không chọn phương án chỉ vì nó nhắc đúng tên đồ vật. Tự hình dung một cảnh đơn giản, đọc hai lời mô tả rồi giải thích chi tiết nào khiến mỗi lời đúng hoặc sai. Khi ôn, đổi chủ ngữ từ một người sang nhiều người để luyện am/is/are.",
        "examples": [
          {
            "prompt": "The woman is placing a folder on the desk.",
            "explanation": "Is placing diễn tả đang đặt. Folder là vật được đặt; on the desk chỉ nơi đặt."
          },
          {
            "prompt": "The chairs are beside the wall.",
            "explanation": "Are beside mô tả vị trí, không khẳng định có người đang chuyển ghế hay ngồi trên ghế."
          }
        ],
        "vocabulary": [
          {
            "word": "carry",
            "meaning": "mang, bê",
            "example": "A man is carrying a small box."
          },
          {
            "word": "place",
            "meaning": "đặt",
            "example": "She is placing a file on the shelf."
          },
          {
            "word": "shelf",
            "meaning": "kệ",
            "example": "The cups are on the shelf."
          },
          {
            "word": "beside",
            "meaning": "bên cạnh",
            "example": "A chair is beside the window."
          }
        ],
        "reading": "In the training room, Hana is placing notebooks on a table. Two colleagues are moving chairs toward the window. A projector is on the shelf, but nobody is using it. The room is getting ready for a workshop.",
        "listening": "Look at the packing area. One employee is carrying a box toward the door. Two employees are checking labels at a table. Several empty boxes are beside the wall. The printer is not running.",
        "guided": [
          {
            "id": "q017",
            "kind": "knowledge",
            "prompt": "Điền từ: “Two employees ___ checking labels.”",
            "options": [
              "are",
              "be",
              "am",
              "is"
            ],
            "answer": 0,
            "explanation": "Two employees là chủ ngữ số nhiều; cấu trúc tiếp diễn cần are checking."
          },
          {
            "id": "q018",
            "kind": "reading",
            "prompt": "Hana đang đặt vật gì lên bàn?",
            "options": [
              "Chairs",
              "Cups",
              "Notebooks",
              "A projector"
            ],
            "answer": 2,
            "explanation": "Hana is placing notebooks on a table."
          },
          {
            "id": "q019",
            "kind": "listening",
            "prompt": "Có bao nhiêu nhân viên đang kiểm tra nhãn?",
            "options": [
              "Two",
              "Four",
              "One",
              "Three"
            ],
            "answer": 0,
            "explanation": "Bài nghe phân biệt one employee carrying và two employees checking."
          }
        ],
        "checkpoint": [
          {
            "id": "q020",
            "kind": "knowledge",
            "prompt": "Câu nào đúng ngữ pháp?",
            "options": [
              "A worker are carrying a box.",
              "A worker carrying a box.",
              "A worker is carrying a box.",
              "A worker is carry a box."
            ],
            "answer": 2,
            "explanation": "Chủ ngữ số ít cần is, sau đó là carrying."
          },
          {
            "id": "q021",
            "kind": "knowledge",
            "prompt": "“The books are on the shelf” cho biết điều gì?",
            "options": [
              "Vị trí của sách",
              "Ai đã mua sách",
              "Ai đang đọc sách",
              "Sách đang được chuyển đi"
            ],
            "answer": 0,
            "explanation": "Be + on the shelf chỉ vị trí, không xác nhận hành động khác."
          },
          {
            "id": "q022",
            "kind": "reading",
            "prompt": "Theo bài đọc, máy chiếu có đang được dùng không?",
            "options": [
              "Không, không ai đang dùng nó.",
              "Có, hai đồng nghiệp đang dùng.",
              "Có, Hana đang dùng.",
              "Bài đọc nói máy bị hỏng."
            ],
            "answer": 0,
            "explanation": "Bài đọc ghi nobody is using it; không nói máy hỏng."
          },
          {
            "id": "q023",
            "kind": "listening",
            "prompt": "Các hộp rỗng nằm ở đâu?",
            "options": [
              "Outside the building",
              "Beside the wall",
              "On the printer",
              "Under the window"
            ],
            "answer": 1,
            "explanation": "Several empty boxes are beside the wall."
          },
          {
            "id": "q024",
            "kind": "vocabulary",
            "prompt": "Trong “placing notebooks”, placing gần nghĩa nào nhất?",
            "options": [
              "Putting",
              "Reading",
              "Counting",
              "Buying"
            ],
            "answer": 0,
            "explanation": "Place trong ngữ cảnh này là đặt, tương đương put."
          }
        ]
      },
      {
        "id": "f04",
        "title": "Việc đã làm và kế hoạch sắp tới",
        "objectives": [
          "Nhận ra quá khứ đơn",
          "Dùng will cho thông tin tương lai",
          "Theo dõi lịch thay đổi qua các mốc"
        ],
        "prerequisites": [
          "f03"
        ],
        "minutes": 35,
        "knowledge": "Quá khứ đơn diễn tả một việc đã xảy ra và kết thúc trong quá khứ. Các mốc yesterday, last week và two days ago thường giúp xác định thời gian. Động từ có quy tắc thường thêm -ed: checked, opened, delivered. Một số động từ đổi dạng, như send thành sent, go thành went, be thành was hoặc were. Không cố gắn -ed vào mọi động từ; hãy ghi lại dạng bất quy tắc theo câu có nghĩa.\n\nTrong câu hỏi và phủ định quá khứ dùng did rồi trả động từ chính về dạng cơ bản: “Did they send the file?” và “They did not send the file”. Với be, dùng was hoặc were trực tiếp: “The meeting was short”. Không ghép did với was trong một câu đơn kiểu “Did the meeting was short?”.\n\nMột cách đơn giản để hiểu thông báo tương lai là will + động từ cơ bản. “The team will visit the site tomorrow” nói về việc sẽ diễn ra. “Will visited” không đúng. Ở các bài sau, kế hoạch còn được diễn đạt bằng be going to hoặc hiện tại tiếp diễn có mốc tương lai; hiện tại chỉ cần phân biệt rõ việc đã xong và việc chưa xảy ra.\n\nKhi đọc email đổi lịch, vẽ ba ô: lịch cũ, thay đổi, lịch mới. Những từ như originally, now, instead và moved to giúp nhận ra phiên bản cuối. Khi nghe số ngày hoặc giờ, đừng dừng ở thông tin xuất hiện đầu tiên; người nói có thể sửa nó ngay sau đó. Sau bài tập, kể lại một việc đã làm hôm qua và một việc sẽ làm ngày mai, chú ý hình thức động từ đi cùng mốc thời gian.",
        "examples": [
          {
            "prompt": "The driver delivered the order yesterday.",
            "explanation": "Delivered là quá khứ có quy tắc; yesterday xác nhận việc đã hoàn tất."
          },
          {
            "prompt": "We will send the updated list tomorrow.",
            "explanation": "Sau will là send dạng cơ bản. Tomorrow chỉ thời điểm tương lai."
          }
        ],
        "vocabulary": [
          {
            "word": "deliver",
            "meaning": "giao hàng",
            "example": "The driver delivered the books yesterday."
          },
          {
            "word": "updated",
            "meaning": "được cập nhật",
            "example": "Please use the updated list."
          },
          {
            "word": "tomorrow",
            "meaning": "ngày mai",
            "example": "The team will arrive tomorrow."
          },
          {
            "word": "instead",
            "meaning": "thay vào đó",
            "example": "Use Room B instead."
          }
        ],
        "reading": "To: Sales team. We sent the first schedule on Monday. The client requested a later start yesterday. The site visit will now begin at 10 a.m. on Friday, not 9 a.m. Please bring the updated checklist.",
        "listening": "Hello, Nora. We received the chairs yesterday. Two lamps were missing, so the supplier will deliver them tomorrow morning. Please leave some space beside the reception desk for the delivery.",
        "guided": [
          {
            "id": "q025",
            "kind": "knowledge",
            "prompt": "Điền từ: “We ___ the client yesterday.”",
            "options": [
              "call",
              "calling",
              "called",
              "will call"
            ],
            "answer": 2,
            "explanation": "Yesterday chỉ việc đã xảy ra; called là quá khứ phù hợp."
          },
          {
            "id": "q026",
            "kind": "reading",
            "prompt": "Chuyến thăm sẽ bắt đầu lúc mấy giờ theo lịch mới?",
            "options": [
              "Yesterday",
              "9 a.m.",
              "Monday morning",
              "10 a.m."
            ],
            "answer": 3,
            "explanation": "Will now begin at 10 a.m.; not 9 a.m. loại lịch cũ."
          },
          {
            "id": "q027",
            "kind": "listening",
            "prompt": "Món nào còn thiếu trong lần giao trước?",
            "options": [
              "Three boxes",
              "Two chairs",
              "Two lamps",
              "One desk"
            ],
            "answer": 2,
            "explanation": "Bài nghe nói two lamps were missing."
          }
        ],
        "checkpoint": [
          {
            "id": "q028",
            "kind": "knowledge",
            "prompt": "Chọn câu đúng:",
            "options": [
              "Did they sends the schedule?",
              "Did they send the schedule?",
              "Did they sent the schedule?",
              "Did they sending the schedule?"
            ],
            "answer": 1,
            "explanation": "Sau did, send trở về dạng cơ bản."
          },
          {
            "id": "q029",
            "kind": "knowledge",
            "prompt": "Điền từ: “The supplier will ___ tomorrow.”",
            "options": [
              "arrived",
              "arrives",
              "arrive",
              "arriving"
            ],
            "answer": 2,
            "explanation": "Will đi cùng động từ nguyên thể không to."
          },
          {
            "id": "q030",
            "kind": "reading",
            "prompt": "Theo bài đọc, cần mang theo vật gì?",
            "options": [
              "The updated checklist",
              "Two lamps",
              "A sales brochure",
              "The first schedule only"
            ],
            "answer": 0,
            "explanation": "Yêu cầu cuối email là bring the updated checklist."
          },
          {
            "id": "q031",
            "kind": "listening",
            "prompt": "Nhà cung cấp sẽ giao phần còn thiếu khi nào?",
            "options": [
              "Tomorrow morning",
              "Next Monday",
              "This evening",
              "Yesterday morning"
            ],
            "answer": 0,
            "explanation": "Bài nghe dùng will deliver them tomorrow morning."
          },
          {
            "id": "q032",
            "kind": "vocabulary",
            "prompt": "“Updated checklist” là gì?",
            "options": [
              "Bản sao bị mất",
              "Phiếu giao hàng cũ",
              "Lịch chưa gửi",
              "Danh sách kiểm tra đã được cập nhật"
            ],
            "answer": 3,
            "explanation": "Updated chỉ phiên bản đã được sửa hoặc bổ sung."
          }
        ]
      },
      {
        "id": "f05",
        "title": "Câu hỏi, địa điểm và chỉ dẫn",
        "objectives": [
          "Nhận diện Who/Where/When/Why/How",
          "Dùng giới từ địa điểm và thời gian",
          "Chọn câu trả lời theo ý hỏi"
        ],
        "prerequisites": [
          "f04"
        ],
        "minutes": 35,
        "knowledge": "Từ để hỏi báo cho người nghe loại thông tin cần tìm. Who hỏi người, where hỏi địa điểm, when hỏi thời gian, why hỏi lý do, how hỏi cách thức hoặc tình trạng. Trong “Where is the printer?”, câu trả lời cần chỉ nơi chốn, không phải một giờ hay tên người. Trong “Who repairs the printer?”, tên kỹ thuật viên có thể phù hợp, nhưng “next to the door” không trả lời đúng ý hỏi.\n\nĐừng chọn đáp án chỉ vì nó lặp lại một từ của câu hỏi. “When does the meeting start?” có thể được trả lời “At ten”, không cần lặp từ meeting. Câu trả lời tự nhiên còn có thể cho biết người khác biết thông tin: “Ask the coordinator”. Tuy nhiên, ở bước đầu hãy tập nhận ra câu trả lời trực tiếp trước, sau đó mới luyện trả lời gián tiếp.\n\nGiới từ giúp định vị thông tin: next to hoặc beside là bên cạnh; opposite là đối diện; between là ở giữa hai đối tượng. Với thời gian, at thường dùng trước giờ, on trước ngày cụ thể, in trước tháng hoặc khoảng thời gian rộng hơn. Đây là quy tắc khởi đầu, không thay thế việc học các cụm cố định qua ngữ cảnh.\n\nKhi đọc hướng dẫn đường đi trong tòa nhà, đặt mình ở điểm xuất phát được nói tới. Đừng đổi trái/phải theo vị trí tưởng tượng khác. Khi nghe, nhận diện từ hỏi đầu câu rồi giữ một ô thông tin cần điền trong đầu. Nếu nghe được “Where”, chờ một địa điểm hoặc lời chỉ dẫn có liên quan. Sau khi chữa bài, giải thích phương án sai thuộc loại thông tin nào: người, giờ, nơi hay lý do. Cách này giúp sửa lỗi hiểu câu thay vì chỉ ghi nhớ chữ cái đáp án.",
        "examples": [
          {
            "prompt": "Where is the supply cabinet? — Next to the stairs.",
            "explanation": "Where yêu cầu địa điểm; next to the stairs cung cấp đúng loại thông tin."
          },
          {
            "prompt": "When is the briefing? — On Tuesday at ten.",
            "explanation": "On đi với Tuesday; at đi với ten. Cả ngày và giờ đều trả lời when."
          }
        ],
        "vocabulary": [
          {
            "word": "opposite",
            "meaning": "đối diện",
            "example": "The cafe is opposite the bank."
          },
          {
            "word": "stairs",
            "meaning": "cầu thang",
            "example": "The cabinet is beside the stairs."
          },
          {
            "word": "briefing",
            "meaning": "buổi phổ biến ngắn",
            "example": "The briefing starts at ten."
          },
          {
            "word": "coordinator",
            "meaning": "người điều phối",
            "example": "Ask the coordinator about the room."
          }
        ],
        "reading": "Visitor guide: The reception desk is on the ground floor. The training room is opposite the stairs. The supply cabinet is between the training room and the kitchen. The safety briefing is on Tuesday at 10 a.m.",
        "listening": "Where can I collect the new access card? Please go to the security desk beside the main entrance. Ravi handles access cards there. The desk opens at eight thirty, and you should bring your staff number.",
        "guided": [
          {
            "id": "q033",
            "kind": "knowledge",
            "prompt": "“Why was the visit canceled?” cần thông tin gì?",
            "options": [
              "A place",
              "A reason",
              "A clock time only",
              "A person’s name only"
            ],
            "answer": 1,
            "explanation": "Why hỏi lý do hủy chuyến thăm."
          },
          {
            "id": "q034",
            "kind": "reading",
            "prompt": "Phòng đào tạo nằm ở đâu?",
            "options": [
              "On the roof",
              "Opposite the stairs",
              "Beside the main entrance",
              "Inside the kitchen"
            ],
            "answer": 1,
            "explanation": "Bài đọc ghi the training room is opposite the stairs."
          },
          {
            "id": "q035",
            "kind": "listening",
            "prompt": "Theo bài nghe, ai xử lý thẻ ra vào?",
            "options": [
              "The visitor",
              "Ravi",
              "The driver",
              "The trainer"
            ],
            "answer": 1,
            "explanation": "Ravi handles access cards there."
          }
        ],
        "checkpoint": [
          {
            "id": "q036",
            "kind": "knowledge",
            "prompt": "Câu trả lời nào phù hợp với “Who leads the workshop?”",
            "options": [
              "Ms. Lane does.",
              "At ten o’clock.",
              "Because it is useful.",
              "In Room C."
            ],
            "answer": 0,
            "explanation": "Who hỏi người phụ trách; Ms. Lane là một người."
          },
          {
            "id": "q037",
            "kind": "knowledge",
            "prompt": "Điền giới từ: “The briefing is ___ Tuesday.”",
            "options": [
              "between",
              "on",
              "at",
              "under"
            ],
            "answer": 1,
            "explanation": "Dùng on trước một ngày trong tuần."
          },
          {
            "id": "q038",
            "kind": "reading",
            "prompt": "Tủ vật tư nằm giữa hai nơi nào?",
            "options": [
              "The stairs and reception",
              "The training room and the kitchen",
              "The cafe and bank",
              "The kitchen and entrance"
            ],
            "answer": 1,
            "explanation": "Bài đọc mô tả between the training room and the kitchen."
          },
          {
            "id": "q039",
            "kind": "listening",
            "prompt": "Người nhận thẻ cần mang theo thông tin gì?",
            "options": [
              "Their room booking",
              "A supplier code",
              "Their staff number",
              "A train ticket"
            ],
            "answer": 2,
            "explanation": "Câu cuối nhắc bring your staff number."
          },
          {
            "id": "q040",
            "kind": "listening",
            "prompt": "Quầy an ninh mở lúc mấy giờ?",
            "options": [
              "10:00",
              "9:30",
              "8:30",
              "8:00"
            ],
            "answer": 2,
            "explanation": "Eight thirty là 8:30, không phải eight hoặc nine thirty."
          }
        ]
      },
      {
        "id": "f06",
        "title": "Đọc mục đích và tổng hợp thông tin",
        "objectives": [
          "Xác định mục đích thông báo",
          "Tìm bằng chứng cho câu trả lời",
          "Kết hợp ngữ pháp nền trong bài đọc/nghe"
        ],
        "prerequisites": [
          "f05"
        ],
        "minutes": 40,
        "knowledge": "Một thông báo thường được viết để người đọc làm một việc cụ thể: biết lịch mới, đăng ký hoạt động, tuân theo hướng dẫn hoặc xử lý một vấn đề. Để tìm mục đích, đọc tiêu đề, câu mở đầu và yêu cầu cuối. Đừng chọn một chi tiết nhỏ làm mục đích toàn văn. Một email có nhắc quán cafe chưa chắc được viết để quảng cáo cafe; quán đó có thể chỉ là địa điểm gặp mặt.\n\nSau khi hiểu mục đích, tìm thông tin chi tiết bằng từ khóa từ câu hỏi. Từ khóa có thể là tên người, ngày, vật hoặc hành động. Câu trả lời đúng cần được hỗ trợ bởi văn bản. Nếu phương án nghe hợp lý trong đời thực nhưng không có bằng chứng, chưa đủ cơ sở chọn. Với câu hỏi điều gì không được nhắc tới, kiểm tra từng phương án còn lại trong bài thay vì đoán theo trí nhớ mơ hồ.\n\nKhi nghe thông báo ngắn, theo dõi ba bước: chuyện gì đang xảy ra, việc đó ảnh hưởng ai, người nghe cần làm gì. Từ but thường báo thay đổi; please và remember thường mở đầu yêu cầu. Sau lần nghe đầu, nói lại ý chính bằng một câu ngắn. Lần nghe sau dùng để kiểm tra số, tên và yêu cầu cụ thể. Không cần dịch từng từ để hiểu một hướng dẫn đơn giản.\n\nBài tổng hợp này dùng lại hiện tại đơn, hiện tại tiếp diễn, quá khứ và tương lai trong cùng ngữ cảnh. Kiểm tra từng câu theo thời gian của chính nó; không áp một thì cho toàn văn. Khi tự ôn, che bài, kể lại ba thông tin chính rồi mở bài để kiểm chứng. Ghi lỗi theo nguyên nhân: thiếu từ vựng, nhầm mốc thời gian hay bỏ qua yêu cầu. Từ đó chọn phần nền cần học lại.",
        "examples": [
          {
            "prompt": "“Please register by Friday” ở cuối thư mời.",
            "explanation": "Đây là yêu cầu hành động với hạn chót. Mục đích toàn thư có thể là mời đăng ký, không chỉ thông báo ngày thứ Sáu."
          },
          {
            "prompt": "Một bài nhắc 9 giờ ở câu đầu nhưng 10 giờ sau từ “now”.",
            "explanation": "Phải đọc ngữ cảnh thay đổi. Giờ hiện hành có thể là 10 giờ; không chọn số xuất hiện đầu tiên một cách máy móc."
          }
        ],
        "vocabulary": [
          {
            "word": "register",
            "meaning": "đăng ký",
            "example": "Please register by Friday."
          },
          {
            "word": "request",
            "meaning": "yêu cầu",
            "example": "The manager received your request."
          },
          {
            "word": "bring",
            "meaning": "mang theo",
            "example": "Bring a notebook to the workshop."
          },
          {
            "word": "available",
            "meaning": "có sẵn, còn chỗ",
            "example": "Six seats are still available."
          }
        ],
        "reading": "Subject: Join the new staff workshop. Oak Office will hold a workshop on Thursday at 2 p.m. in Room C. Participants will learn how to use the booking system. Please register with Mina by Tuesday and bring a notebook. Six seats are still available.",
        "listening": "Attention, team. The front entrance is being cleaned this morning. Please use the side entrance until noon. The reception desk is open as usual. If you need help with a delivery, call the office assistant.",
        "guided": [
          {
            "id": "q041",
            "kind": "reading",
            "prompt": "Mục đích chính của email là gì?",
            "options": [
              "To sell notebooks",
              "To cancel a booking system",
              "To report a closed office",
              "To invite staff to a workshop"
            ],
            "answer": 3,
            "explanation": "Subject và yêu cầu register đều hướng tới việc mời tham gia workshop."
          },
          {
            "id": "q042",
            "kind": "knowledge",
            "prompt": "“The office will hold a workshop” nói về thời gian nào?",
            "options": [
              "The future",
              "A completed past event",
              "No time information",
              "A daily habit only"
            ],
            "answer": 0,
            "explanation": "Will hold diễn tả sự kiện sắp tới."
          },
          {
            "id": "q043",
            "kind": "listening",
            "prompt": "Vì sao cần dùng cửa bên?",
            "options": [
              "The office is closed.",
              "The reception desk moved.",
              "The front entrance is being cleaned.",
              "A workshop fills the hall."
            ],
            "answer": 2,
            "explanation": "Bài nghe nêu lý do là việc vệ sinh cửa chính."
          }
        ],
        "checkpoint": [
          {
            "id": "q044",
            "kind": "reading",
            "prompt": "Hạn đăng ký workshop là khi nào?",
            "options": [
              "Thursday",
              "Monday",
              "Tuesday",
              "Friday"
            ],
            "answer": 2,
            "explanation": "Workshop diễn ra Thursday nhưng đăng ký by Tuesday."
          },
          {
            "id": "q045",
            "kind": "reading",
            "prompt": "Người tham gia cần mang gì?",
            "options": [
              "A laptop",
              "A notebook",
              "An access card",
              "A delivery receipt"
            ],
            "answer": 1,
            "explanation": "Email yêu cầu bring a notebook, không yêu cầu các vật khác."
          },
          {
            "id": "q046",
            "kind": "listening",
            "prompt": "Cần dùng cửa bên đến khi nào?",
            "options": [
              "Until Thursday",
              "Until two",
              "All week",
              "Until noon"
            ],
            "answer": 3,
            "explanation": "Bài nghe nói until noon: đến trưa."
          },
          {
            "id": "q047",
            "kind": "listening",
            "prompt": "Quầy lễ tân hoạt động thế nào trong buổi sáng?",
            "options": [
              "It is closed.",
              "It is open as usual.",
              "It only accepts deliveries.",
              "It moves outside."
            ],
            "answer": 1,
            "explanation": "The reception desk is open as usual xác nhận vẫn hoạt động bình thường."
          },
          {
            "id": "q048",
            "kind": "knowledge",
            "prompt": "Chọn câu đúng về đăng ký: “Mina ___ the list every day.”",
            "options": [
              "checks",
              "will checks",
              "checking",
              "check"
            ],
            "answer": 0,
            "explanation": "Every day nói thói quen; Mina số ít nên checks."
          }
        ]
      }
    ]
  },
  {
    "id": "toeic-250-450",
    "title": "Củng cố cơ bản",
    "band": "Mục tiêu 250–450",
    "description": "Chặng thử nghiệm cho người đã biết câu cơ bản: từ loại, mốc thời gian, hỏi–đáp, hội thoại và thông báo công việc.",
    "units": [
      {
        "id": "a01",
        "title": "Từ loại và hòa hợp chủ–vị",
        "objectives": [
          "Nhận diện vị trí danh từ, tính từ, trạng từ",
          "Tìm chủ ngữ thật khi có cụm bổ nghĩa",
          "Áp dụng vào câu văn phòng"
        ],
        "prerequisites": [],
        "minutes": 40,
        "knowledge": "Chặng này giả định bạn đã phân biệt được câu đơn, hiện tại đơn và quá khứ đơn. Nếu các ý đó còn khó, hãy ôn chặng Nền tảng trước khi tiếp tục. Trong câu điền từ, bước đầu tiên là xác định vị trí trống cần vai trò gì, không vội chọn từ có nghĩa quen thuộc. Danh từ thường đứng sau mạo từ hoặc tính từ; tính từ thường bổ nghĩa cho danh từ; trạng từ có thể bổ nghĩa cho động từ hoặc tính từ. Hậu tố là gợi ý, không phải đáp án tự động.\n\nSo sánh “a careful review” với “review the file carefully”. Trong cụm đầu, careful bổ nghĩa cho danh từ review. Trong cụm sau, carefully bổ nghĩa cho hành động review. Cùng một gốc từ nhưng vai trò khác nhau. Đọc đủ cụm trước và sau chỗ trống để phân biệt. Không phải mọi từ kết thúc bằng -ly đều là trạng từ: friendly thường là tính từ.\n\nĐể chọn động từ, tìm chủ ngữ chính và tách cụm chen giữa. Trong “The list of suppliers is ready”, chủ ngữ là list, không phải suppliers. Vì list số ít nên dùng is. Trong “The suppliers on the list are local”, chủ ngữ là suppliers nên dùng are. Khoảng cách giữa chủ ngữ và động từ không làm thay đổi quy tắc hòa hợp.\n\nQuy trình làm bài là đánh dấu chỗ trống, dự đoán từ loại, xác định chủ ngữ hoặc từ được bổ nghĩa, rồi kiểm tra nghĩa toàn câu. Khi chữa, ghi rõ quy tắc và vị trí đã bỏ qua. Tự tạo một cặp câu dùng hai dạng của cùng gốc từ; lần ôn sau che đáp án và giải thích sự khác nhau thay vì chỉ đọc lại câu đúng.",
        "examples": [
          {
            "prompt": "The list of rooms is on the desk.",
            "explanation": "List là danh từ chính số ít; of rooms chỉ bổ sung thông tin. Dùng is, không dùng are theo rooms."
          },
          {
            "prompt": "The receptionist answered politely.",
            "explanation": "Politely là trạng từ mô tả cách trả lời. Polite là tính từ, thường dùng để mô tả một người hoặc danh từ."
          }
        ],
        "vocabulary": [
          {
            "word": "supplier",
            "meaning": "nhà cung cấp",
            "example": "The supplier confirmed the delivery."
          },
          {
            "word": "careful",
            "meaning": "cẩn thận",
            "example": "Please make a careful review."
          },
          {
            "word": "accurately",
            "meaning": "một cách chính xác",
            "example": "Enter the address accurately."
          },
          {
            "word": "local",
            "meaning": "địa phương",
            "example": "We use a local supplier."
          }
        ],
        "reading": "Please review the attached supplier list carefully. The list of approved suppliers is updated every month. Each supplier provides a local contact number. Send any corrections to Linh before Friday; she will prepare the final copy.",
        "listening": "This is a reminder for new assistants. Enter each customer address accurately. A supervisor reviews the entries every afternoon. If an address is unclear, ask the customer to confirm it before saving the record.",
        "guided": [
          {
            "id": "q049",
            "kind": "knowledge",
            "prompt": "Điền từ: “The list of suppliers ___ ready.”",
            "options": [
              "being",
              "is",
              "be",
              "are"
            ],
            "answer": 1,
            "explanation": "Danh từ chính của chủ ngữ là list số ít."
          },
          {
            "id": "q050",
            "kind": "reading",
            "prompt": "Danh sách nhà cung cấp được cập nhật bao lâu một lần?",
            "options": [
              "Every year",
              "Every month",
              "Every Friday",
              "Every day"
            ],
            "answer": 1,
            "explanation": "Bài đọc ghi updated every month."
          },
          {
            "id": "q051",
            "kind": "listening",
            "prompt": "Ai kiểm tra các mục nhập mỗi chiều?",
            "options": [
              "A supervisor",
              "A visitor",
              "A supplier",
              "A driver"
            ],
            "answer": 0,
            "explanation": "Bài nghe nói a supervisor reviews the entries every afternoon."
          }
        ],
        "checkpoint": [
          {
            "id": "q052",
            "kind": "knowledge",
            "prompt": "Điền từ: “Please enter the details ___.”",
            "options": [
              "accuracy",
              "accurate",
              "accurateness",
              "accurately"
            ],
            "answer": 3,
            "explanation": "Chỗ trống bổ nghĩa cho động từ enter, cần trạng từ accurately."
          },
          {
            "id": "q053",
            "kind": "knowledge",
            "prompt": "Điền từ: “The suppliers on this list ___ local.”",
            "options": [
              "was",
              "are",
              "am",
              "is"
            ],
            "answer": 1,
            "explanation": "Suppliers là danh từ chính số nhiều; on this list chỉ là cụm bổ nghĩa."
          },
          {
            "id": "q054",
            "kind": "reading",
            "prompt": "Ai chuẩn bị bản cuối cùng của danh sách?",
            "options": [
              "A customer",
              "Linh",
              "The receptionist",
              "Each supplier"
            ],
            "answer": 1,
            "explanation": "Câu cuối nói Linh will prepare the final copy."
          },
          {
            "id": "q055",
            "kind": "listening",
            "prompt": "Nên làm gì nếu địa chỉ chưa rõ?",
            "options": [
              "Ask the customer to confirm it.",
              "Wait until next month.",
              "Delete the whole record.",
              "Save it immediately."
            ],
            "answer": 0,
            "explanation": "Bài nghe yêu cầu xác nhận với khách trước khi lưu."
          },
          {
            "id": "q056",
            "kind": "vocabulary",
            "prompt": "“A careful review” dùng careful để bổ nghĩa cho gì?",
            "options": [
              "A missing verb",
              "The noun review",
              "A past action",
              "The word a only"
            ],
            "answer": 1,
            "explanation": "Review trong cụm a careful review là danh từ; careful mô tả việc rà soát đó."
          }
        ]
      },
      {
        "id": "a02",
        "title": "Thì và bị động trong cập nhật công việc",
        "objectives": [
          "Chọn thời gian theo ngữ cảnh",
          "Phân biệt người làm và vật nhận hành động",
          "Hiểu việc đã hoàn tất và việc đang chờ"
        ],
        "prerequisites": [
          "a01"
        ],
        "minutes": 40,
        "knowledge": "Email công việc thường kể một việc đã xong, một tình trạng hiện tại và một bước tiếp theo. Vì vậy, không chọn cùng một thì cho mọi câu. Dùng mốc như yesterday, currently, tomorrow và quan hệ giữa các việc để quyết định. “We shipped the order yesterday” là việc đã hoàn tất; “The team checks orders daily” là thói quen; “We will ship the order tomorrow” là việc sắp tới.\n\nChủ động đặt người thực hiện làm chủ ngữ: “The technician repaired the printer”. Bị động đặt vật chịu tác động làm chủ ngữ: “The printer was repaired”. Công thức khởi đầu là be ở thì phù hợp + quá khứ phân từ. Không phải mọi từ có -ed sau be đều có cùng chức năng; đọc ý nghĩa và cấu trúc để biết đó là hành động bị động hay tính từ chỉ trạng thái.\n\nỞ mức này tập trung vào is/are checked cho quy trình thường lệ, was/were delivered cho việc quá khứ và will be installed cho kế hoạch. Khi vật là chủ ngữ, kiểm tra xem vật tự thực hiện hay nhận hành động. Một chiếc máy không tự “install” chính nó trong thông báo lắp đặt thông thường, nên “will be installed” phù hợp. Cụm by a technician có thể chỉ người thực hiện nhưng không bắt buộc xuất hiện.\n\nKhi đọc cập nhật, chia thông tin thành đã xong, đang có vấn đề và sẽ làm. Tránh suy ra việc đã hoàn tất chỉ từ một lời hứa giao hàng. Khi nghe, chú ý động từ cùng mốc thời gian cuối câu; cả hai tạo bằng chứng. Sau khi chữa bài, thử chuyển một câu chủ động sang bị động và kiểm tra xem thông tin người thực hiện có thực sự quan trọng không. Ghi lại lỗi chia be riêng với lỗi dùng quá khứ phân từ.",
        "examples": [
          {
            "prompt": "The packages were delivered yesterday.",
            "explanation": "Packages nhận hành động giao; yesterday chỉ quá khứ; số nhiều cần were + delivered."
          },
          {
            "prompt": "The new software will be installed on Monday.",
            "explanation": "Software nhận hành động cài đặt trong tương lai, nên dùng will be installed."
          }
        ],
        "vocabulary": [
          {
            "word": "install",
            "meaning": "cài đặt, lắp đặt",
            "example": "A technician will install the software."
          },
          {
            "word": "repair",
            "meaning": "sửa chữa",
            "example": "The printer was repaired yesterday."
          },
          {
            "word": "shipment",
            "meaning": "lô hàng",
            "example": "The shipment arrived on Tuesday."
          },
          {
            "word": "confirm",
            "meaning": "xác nhận",
            "example": "Please confirm the new date."
          }
        ],
        "reading": "The new tablets arrived yesterday. They were checked by the IT team this morning. Training software will be installed on Monday. Employees can collect the tablets on Tuesday afternoon after the setup is complete.",
        "listening": "Hello, this is City Repairs. Your printer was repaired this morning, but the driver has not collected it yet. We will deliver it tomorrow between nine and eleven. Please confirm that someone will be at reception.",
        "guided": [
          {
            "id": "q057",
            "kind": "knowledge",
            "prompt": "Điền từ: “The printer ___ yesterday.”",
            "options": [
              "will repair",
              "is repairing",
              "was repaired",
              "repairs"
            ],
            "answer": 2,
            "explanation": "Printer là vật nhận hành động và yesterday yêu cầu quá khứ."
          },
          {
            "id": "q058",
            "kind": "reading",
            "prompt": "Nhân viên có thể nhận máy tính bảng khi nào?",
            "options": [
              "Tuesday afternoon",
              "Yesterday",
              "Sunday evening",
              "Monday morning"
            ],
            "answer": 0,
            "explanation": "Câu cuối nêu Tuesday afternoon sau khi hoàn tất thiết lập."
          },
          {
            "id": "q059",
            "kind": "listening",
            "prompt": "Theo bài nghe, máy in đã được sửa chưa?",
            "options": [
              "The speaker does not know.",
              "No, it needs a new order.",
              "It will only be inspected next week.",
              "Yes, this morning."
            ],
            "answer": 3,
            "explanation": "Your printer was repaired this morning xác nhận đã sửa."
          }
        ],
        "checkpoint": [
          {
            "id": "q060",
            "kind": "knowledge",
            "prompt": "Điền từ: “The software will ___ on Monday.”",
            "options": [
              "installing",
              "be installed",
              "be install",
              "installed"
            ],
            "answer": 1,
            "explanation": "Bị động tương lai cần will be + past participle installed."
          },
          {
            "id": "q061",
            "kind": "knowledge",
            "prompt": "Câu nào mô tả quy trình thường lệ đúng?",
            "options": [
              "Orders will checking every morning.",
              "Orders checked every morning.",
              "Orders is checked every morning.",
              "Orders are checked every morning."
            ],
            "answer": 3,
            "explanation": "Orders số nhiều và nhận hành động nên are checked."
          },
          {
            "id": "q062",
            "kind": "reading",
            "prompt": "Ai kiểm tra các máy tính bảng?",
            "options": [
              "The reception team",
              "All employees",
              "The IT team",
              "A courier"
            ],
            "answer": 2,
            "explanation": "They were checked by the IT team."
          },
          {
            "id": "q063",
            "kind": "listening",
            "prompt": "Thời gian giao máy in được hẹn là khi nào?",
            "options": [
              "Yesterday, before eleven.",
              "Tomorrow, between nine and eleven.",
              "Today, after eleven.",
              "Next Monday, at nine."
            ],
            "answer": 1,
            "explanation": "Bài nghe nêu rõ tomorrow between nine and eleven."
          },
          {
            "id": "q064",
            "kind": "listening",
            "prompt": "Người gọi yêu cầu xác nhận điều gì?",
            "options": [
              "Someone will be at reception.",
              "A new tablet was ordered.",
              "The driver has collected the printer.",
              "The printer is still broken."
            ],
            "answer": 0,
            "explanation": "Câu cuối hỏi có người tại lễ tân để nhận; máy chưa được tài xế lấy."
          }
        ]
      },
      {
        "id": "a03",
        "title": "Hỏi–đáp: hiểu ý thay vì bắt từ",
        "objectives": [
          "Nhận diện chức năng câu hỏi",
          "Hiểu câu trả lời gián tiếp đơn giản",
          "Loại bẫy lặp từ và nhầm thời gian"
        ],
        "prerequisites": [
          "a02"
        ],
        "minutes": 40,
        "knowledge": "Trong hội thoại, người nói không phải lúc nào cũng trả lời bằng cấu trúc giống câu hỏi. “Where is the meeting?” có thể được đáp “Check the invitation”, vì lời mời chứa địa điểm. Câu trả lời này không nói địa điểm trực tiếp nhưng vẫn giúp giải quyết điều người hỏi cần biết. Trước tiên xác định câu hỏi muốn tìm người, nơi, giờ, lý do hay đề nghị hành động; sau đó đánh giá quan hệ ý nghĩa của cả câu trả lời.\n\nCâu hỏi yes/no có thể được đáp bằng thông tin giải thích thay vì yes hoặc no. Với “Have you finished the slides?”, “I still need to add one chart” hàm ý chưa xong. Không suy rộng thành việc người nói không bao giờ làm slide; chỉ kết luận trong phạm vi thông tin được nói. Câu hỏi lựa chọn như “Today or tomorrow?” cần một lựa chọn hoặc đề xuất khác có liên quan, không nhất thiết trả lời yes.\n\nMột bẫy thường gặp là phương án lặp từ của câu hỏi nhưng đổi ý. “Who booked the room?” không được trả lời đúng bằng “The room is spacious”. Từ room giống nhau nhưng thiếu người đặt. Một bẫy khác là nghe nhầm âm gần giống hoặc bỏ mất phủ định. Trong bước luyện đầu, ưu tiên hiểu quan hệ hỏi–đáp trước khi tăng tốc độ.\n\nKhi luyện, nghe câu hỏi một lần và nói thầm loại thông tin cần tìm. Nghe hết câu đáp trước khi quyết định. Sau khi chữa, tự viết một câu trả lời trực tiếp và một câu trả lời gián tiếp cho cùng câu hỏi. Nếu sai, ghi nguyên nhân là không nhận ra chức năng hỏi, thiếu từ hay suy luận quá mức. Lần ôn sau dùng câu mới cùng chức năng để kiểm tra khả năng chuyển giao, thay vì học thuộc đúng một hội thoại.",
        "examples": [
          {
            "prompt": "Have you sent the invoice? — I am waiting for the final amount.",
            "explanation": "Câu trả lời hàm ý chưa gửi vì còn chờ số tiền cuối. Không cần xuất hiện từ no để diễn đạt ý đó."
          },
          {
            "prompt": "Who has the room key? — Ask the receptionist.",
            "explanation": "Lời đáp chỉ người nên hỏi để tìm thông tin. Nó có liên quan dù không khẳng định lễ tân đang giữ chìa khóa."
          }
        ],
        "vocabulary": [
          {
            "word": "invoice",
            "meaning": "hóa đơn",
            "example": "Please send the invoice by email."
          },
          {
            "word": "amount",
            "meaning": "số tiền, lượng",
            "example": "We are checking the final amount."
          },
          {
            "word": "invitation",
            "meaning": "thư mời",
            "example": "The room number is on the invitation."
          },
          {
            "word": "available",
            "meaning": "rảnh, có sẵn",
            "example": "Is the designer available today?"
          }
        ],
        "reading": "Team message: For room locations, check the meeting invitation. If you need an access key, contact the receptionist. The equipment coordinator handles projector requests. Please send projector requests one day before your meeting.",
        "listening": "Have you finished the presentation? Not yet. I still need the sales chart from Lina. Will you be ready this afternoon? If she sends it before noon, I can finish by three. Please let me know when it is ready.",
        "guided": [
          {
            "id": "q065",
            "kind": "knowledge",
            "prompt": "Đáp nào phù hợp với “Where is tomorrow’s briefing?”",
            "options": [
              "The room looks clean.",
              "The room is listed in the invitation.",
              "I briefed her yesterday.",
              "Tomorrow is a busy day."
            ],
            "answer": 1,
            "explanation": "Lời mời chứa địa điểm, nên đáp đầu giúp trả lời Where."
          },
          {
            "id": "q066",
            "kind": "reading",
            "prompt": "Ai xử lý yêu cầu máy chiếu?",
            "options": [
              "The receptionist",
              "Every meeting guest",
              "The equipment coordinator",
              "Lina"
            ],
            "answer": 2,
            "explanation": "Bài đọc phân công equipment coordinator cho projector requests."
          },
          {
            "id": "q067",
            "kind": "listening",
            "prompt": "Vì sao bài thuyết trình chưa xong?",
            "options": [
              "The meeting was canceled.",
              "The printer is missing.",
              "The room is locked.",
              "The sales chart is still needed."
            ],
            "answer": 3,
            "explanation": "Người nói còn cần sales chart từ Lina."
          }
        ],
        "checkpoint": [
          {
            "id": "q068",
            "kind": "knowledge",
            "prompt": "Đáp nào phù hợp với “Have you printed the agenda?”",
            "options": [
              "The print shop is blue.",
              "It is a useful agenda.",
              "The printer is still warming up.",
              "I like printed books."
            ],
            "answer": 2,
            "explanation": "Máy in còn khởi động hàm ý việc in chưa hoàn tất; các câu khác không giải quyết câu hỏi."
          },
          {
            "id": "q069",
            "kind": "knowledge",
            "prompt": "“Today or tomorrow?” là loại câu hỏi nào?",
            "options": [
              "A request for a reason",
              "A question about location",
              "A request for a person",
              "A choice between times"
            ],
            "answer": 3,
            "explanation": "Người nói đưa ra hai lựa chọn thời gian."
          },
          {
            "id": "q070",
            "kind": "reading",
            "prompt": "Nên gửi yêu cầu máy chiếu trước cuộc họp bao lâu?",
            "options": [
              "One month",
              "One day",
              "One week",
              "One hour"
            ],
            "answer": 1,
            "explanation": "Câu cuối ghi one day before your meeting."
          },
          {
            "id": "q071",
            "kind": "listening",
            "prompt": "Người nói có thể hoàn thành lúc ba giờ với điều kiện nào?",
            "options": [
              "The meeting moves to tomorrow.",
              "The manager prints the agenda.",
              "Lina attends the meeting.",
              "Lina sends the chart before noon."
            ],
            "answer": 3,
            "explanation": "If she sends it before noon là điều kiện; không phải một lời cam kết vô điều kiện."
          },
          {
            "id": "q072",
            "kind": "listening",
            "prompt": "Người hỏi yêu cầu làm gì khi bài thuyết trình sẵn sàng?",
            "options": [
              "Cancel the sales chart.",
              "Send a projector request.",
              "Book another room.",
              "Let them know."
            ],
            "answer": 3,
            "explanation": "Câu cuối là Please let me know when it is ready."
          }
        ]
      },
      {
        "id": "a04",
        "title": "Hội thoại: vấn đề và bước tiếp theo",
        "objectives": [
          "Xác định nơi chốn qua bằng chứng",
          "Theo dõi vấn đề và giải pháp",
          "Phân biệt đề xuất với quyết định"
        ],
        "prerequisites": [
          "a03"
        ],
        "minutes": 40,
        "knowledge": "Một hội thoại công việc thường có tình huống, vấn đề và bước tiếp theo. Người nghe cần nối các lượt lời, không chỉ hiểu từng câu riêng. Nếu một người nói tài liệu chưa in và người kia đề nghị dùng bản điện tử, câu hỏi “What will they probably do next?” phải dựa vào việc họ chấp nhận hoặc từ chối đề nghị đó. Một ý tưởng được nhắc tới chưa chắc trở thành quyết định.\n\nĐể xác định bối cảnh, gom nhiều tín hiệu: booking, check-in và key card có thể hướng tới khách sạn, nhưng một từ đơn lẻ thường chưa đủ. Chú ý vai trò của người nói và loại việc họ giải quyết. Khi câu hỏi hỏi nghề nghiệp hoặc địa điểm có khả năng, chọn đáp án được nhiều chi tiết hỗ trợ nhất, không thêm giả định bên ngoài.\n\nTheo dõi các từ chuyển ý như but, however, actually, instead. “We could meet at nine, but the client arrives at ten” cho biết chín giờ có thể không còn phù hợp. Sau đó nghe tiếp lời chốt. Các cụm “I will”, “Let us” hoặc “That works” thường giúp nhận ra hành động đã thống nhất. Tên người và đại từ cần được nối đúng; she ở lượt sau có thể chỉ người vừa được nhắc, không nhất thiết người đang nói.\n\nTrước khi nghe, xem câu hỏi để biết cần theo dõi mục đích, chi tiết hay bước tiếp theo. Không cần đoán toàn bộ câu chuyện. Sau khi nghe, nói lại chuỗi vấn đề–giải pháp–người thực hiện bằng một câu. Khi chữa, chỉ ra lượt lời cụ thể hỗ trợ đáp án và một phương án từng được cân nhắc nhưng đã bị loại. Bắt đầu với đoạn ngắn, rồi mới tăng số người và lượng chi tiết.",
        "examples": [
          {
            "prompt": "“We could order more chairs.” — “No need; I found six in storage.”",
            "explanation": "Mua thêm chỉ là đề xuất. Thông tin kho có sáu ghế khiến đề xuất đó không còn cần thiết."
          },
          {
            "prompt": "“Could you email the handout?” — “Sure, I will send it now.”",
            "explanation": "Lượt đáp nhận việc rõ ràng; bước tiếp theo của người đáp là gửi tài liệu qua email."
          }
        ],
        "vocabulary": [
          {
            "word": "handout",
            "meaning": "tài liệu phát cho người học",
            "example": "The handout includes a short exercise."
          },
          {
            "word": "storage",
            "meaning": "kho, nơi cất giữ",
            "example": "Extra chairs are in storage."
          },
          {
            "word": "delay",
            "meaning": "sự chậm trễ",
            "example": "A traffic delay affected the delivery."
          },
          {
            "word": "arrange",
            "meaning": "sắp xếp",
            "example": "We will arrange the chairs before lunch."
          }
        ],
        "reading": "Workshop note: The room has twenty chairs, but twenty-four people registered. Four extra chairs are available in the storage room. Kai will bring them before lunch. The handouts have already been emailed to all participants.",
        "listening": "A: The delivery van is delayed, so our sample boxes will not arrive before the client meeting. B: Can we move the meeting? A: The client cannot stay later. B: Then let us show the digital catalog first. A: Good idea. I will open it on the meeting room computer now.",
        "guided": [
          {
            "id": "q073",
            "kind": "reading",
            "prompt": "Cần lấy thêm bao nhiêu ghế?",
            "options": [
              "Twenty",
              "Six",
              "Twenty-four",
              "Four"
            ],
            "answer": 3,
            "explanation": "Có 20 ghế và 24 người đăng ký; bài đọc cũng xác nhận cần bốn ghế phụ."
          },
          {
            "id": "q074",
            "kind": "listening",
            "prompt": "Vấn đề của nhóm trong bài nghe là gì?",
            "options": [
              "The catalog has no prices.",
              "Sample boxes will arrive too late.",
              "The client canceled the visit.",
              "The computer is broken."
            ],
            "answer": 1,
            "explanation": "Xe giao chậm khiến mẫu không đến trước cuộc họp."
          },
          {
            "id": "q075",
            "kind": "knowledge",
            "prompt": "Đề xuất và quyết định khác nhau ở điểm nào?",
            "options": [
              "They are identical in every conversation.",
              "A decision always describes the past.",
              "Every proposal is a completed action.",
              "A proposal may be rejected before an action is agreed."
            ],
            "answer": 3,
            "explanation": "Cần nghe phần phản hồi/chốt để biết đề xuất có được chấp nhận không."
          }
        ],
        "checkpoint": [
          {
            "id": "q076",
            "kind": "reading",
            "prompt": "Ai sẽ mang ghế phụ đến?",
            "options": [
              "The van driver",
              "All participants",
              "Kai",
              "The client"
            ],
            "answer": 2,
            "explanation": "Kai will bring them before lunch."
          },
          {
            "id": "q077",
            "kind": "knowledge",
            "prompt": "Câu “We could move the meeting” tự nó cho biết điều gì?",
            "options": [
              "The meeting was canceled yesterday.",
              "Moving the meeting is an option being proposed.",
              "The meeting has already moved.",
              "The client has confirmed a new time."
            ],
            "answer": 1,
            "explanation": "Could đưa ra một khả năng hoặc đề xuất. Cần nghe phản hồi tiếp theo để biết nhóm có chọn phương án đó không."
          },
          {
            "id": "q078",
            "kind": "listening",
            "prompt": "Vì sao không dời cuộc họp sang muộn hơn?",
            "options": [
              "The sample boxes are damaged.",
              "The computer is unavailable.",
              "The client cannot stay later.",
              "The room has no chairs."
            ],
            "answer": 2,
            "explanation": "Đây là lý do trực tiếp được nêu khi đề xuất dời giờ."
          },
          {
            "id": "q079",
            "kind": "listening",
            "prompt": "Nhóm quyết định trình bày gì trước?",
            "options": [
              "A storage plan",
              "The delivery invoice",
              "The digital catalog",
              "The physical samples"
            ],
            "answer": 2,
            "explanation": "Let us show the digital catalog first được đồng ý bằng Good idea."
          },
          {
            "id": "q080",
            "kind": "listening",
            "prompt": "Người nói A sẽ làm gì ngay sau đó?",
            "options": [
              "Open the catalog on the meeting room computer.",
              "Drive the delivery van.",
              "Collect chairs from storage.",
              "Call all participants."
            ],
            "answer": 0,
            "explanation": "Lượt cuối có I will open it ... now; it chỉ digital catalog."
          }
        ]
      },
      {
        "id": "a05",
        "title": "Email, thông báo và liên kết đoạn",
        "objectives": [
          "Tìm mục đích và yêu cầu của email",
          "Hiểu because/but/therefore",
          "Chọn câu phù hợp với mạch văn"
        ],
        "prerequisites": [
          "a04"
        ],
        "minutes": 40,
        "knowledge": "Đọc một email ngắn hiệu quả bắt đầu bằng việc xác định người nhận, lý do viết và hành động cần làm. Tiêu đề là gợi ý nhưng không đủ để trả lời mọi câu hỏi. Câu mở đầu có thể nêu vấn đề; phần giữa cung cấp chi tiết; câu cuối đưa yêu cầu hoặc hạn chót. Gạch ý chính trong đầu thay vì đánh dấu mọi từ.\n\nTừ nối diễn tả quan hệ giữa các ý. Because giới thiệu lý do; but hoặc however báo tương phản; therefore hoặc so thể hiện kết quả. “The room is small, so we limited registration” có quan hệ nguyên nhân–kết quả. Không chọn however chỉ vì nó là từ trang trọng. Hãy thử nói hai ý bằng tiếng Việt và xem chúng bổ sung, đối lập hay kéo theo nhau.\n\nỞ câu điền vào đoạn, một câu đúng ngữ pháp vẫn có thể sai mạch ý. Đọc câu trước và sau chỗ trống. Đại từ this, it, they cần một đối tượng hợp lý đã xuất hiện. “These changes” phải có thay đổi nào đó ở gần; “For this reason” phải có lý do phía trước. Câu được chọn cũng cần dẫn sang thông tin sau mà không gây mâu thuẫn về thời gian hoặc chủ thể.\n\nVới câu hỏi chi tiết, tìm chính xác hạn chót, điều kiện hoặc địa điểm; chú ý before, by, after và until. Khi gặp câu hỏi mục đích, chọn ý bao quát hành động chính, không chọn một danh từ ngẫu nhiên trong bài. Sau khi chữa, tóm tắt email bằng cấu trúc người gửi muốn ai làm gì và vì sao. Khi ôn, tự viết một thông báo bốn câu có lý do, thay đổi và yêu cầu; kiểm tra từng từ nối có quan hệ đúng hay không.",
        "examples": [
          {
            "prompt": "The room is being repaired, so the class will move upstairs.",
            "explanation": "So nối lý do sửa phòng với kết quả chuyển lớp. However sẽ gợi tương phản không phù hợp ở đây."
          },
          {
            "prompt": "“Please use the east entrance. It is next to the bicycle rack.”",
            "explanation": "It chỉ east entrance; câu sau bổ sung vị trí của đúng lối vào được nhắc ở câu trước."
          }
        ],
        "vocabulary": [
          {
            "word": "deadline",
            "meaning": "hạn chót",
            "example": "The registration deadline is Friday."
          },
          {
            "word": "temporary",
            "meaning": "tạm thời",
            "example": "This is a temporary change."
          },
          {
            "word": "entrance",
            "meaning": "lối vào",
            "example": "Use the east entrance."
          },
          {
            "word": "notify",
            "meaning": "thông báo cho",
            "example": "Please notify your team."
          }
        ],
        "reading": "Subject: Temporary parking change. The west parking area will be resurfaced on Wednesday. Therefore, staff should use the east parking area that day. Visitors may park beside the main entrance. Please notify your team before Tuesday afternoon. The west area will reopen on Thursday.",
        "listening": "This is a message from the training desk. Because the afternoon workshop is full, we have added a second session at nine on Friday morning. If you want to change your booking, email the training desk by Thursday noon. Your original booking remains valid unless you request a change.",
        "guided": [
          {
            "id": "q081",
            "kind": "knowledge",
            "prompt": "Trong bài đọc, Therefore thể hiện quan hệ gì?",
            "options": [
              "A new unrelated example",
              "A question",
              "A result of the parking work",
              "A contrast with no reason"
            ],
            "answer": 2,
            "explanation": "Thi công bãi phía tây dẫn đến việc dùng bãi phía đông."
          },
          {
            "id": "q082",
            "kind": "reading",
            "prompt": "Khách đến làm việc được đỗ xe ở đâu?",
            "options": [
              "At the training desk",
              "In the west parking area",
              "On the road",
              "Beside the main entrance"
            ],
            "answer": 3,
            "explanation": "Bài đọc tách visitors khỏi staff và chỉ chỗ cạnh cửa chính."
          },
          {
            "id": "q083",
            "kind": "listening",
            "prompt": "Vì sao có buổi workshop thứ hai?",
            "options": [
              "The original session has ended.",
              "The trainer canceled Friday.",
              "The parking area is closed.",
              "The afternoon workshop is full."
            ],
            "answer": 3,
            "explanation": "Because the afternoon workshop is full là lý do trực tiếp."
          }
        ],
        "checkpoint": [
          {
            "id": "q084",
            "kind": "knowledge",
            "prompt": "Chọn từ nối: “The first session is full; ___, we added another session.”",
            "options": [
              "therefore",
              "although",
              "despite",
              "however"
            ],
            "answer": 0,
            "explanation": "Thêm buổi học là kết quả của việc buổi đầu đã đầy."
          },
          {
            "id": "q085",
            "kind": "reading",
            "prompt": "Khi nào bãi đỗ phía tây mở lại?",
            "options": [
              "Friday",
              "Tuesday afternoon",
              "Wednesday morning",
              "Thursday"
            ],
            "answer": 3,
            "explanation": "Câu cuối ghi reopen on Thursday."
          },
          {
            "id": "q086",
            "kind": "reading",
            "prompt": "Nhân viên phải thông báo cho nhóm trước lúc nào?",
            "options": [
              "Thursday noon",
              "Tuesday afternoon",
              "Wednesday evening",
              "Friday morning"
            ],
            "answer": 1,
            "explanation": "Email yêu cầu notify your team before Tuesday afternoon."
          },
          {
            "id": "q087",
            "kind": "listening",
            "prompt": "Hạn yêu cầu đổi buổi workshop là khi nào?",
            "options": [
              "Thursday noon",
              "Wednesday afternoon",
              "Tuesday morning",
              "Friday noon"
            ],
            "answer": 0,
            "explanation": "Email the training desk by Thursday noon là hạn yêu cầu đổi."
          },
          {
            "id": "q088",
            "kind": "listening",
            "prompt": "Nếu không yêu cầu đổi, đặt chỗ ban đầu sẽ thế nào?",
            "options": [
              "It remains valid.",
              "It moves to Friday automatically.",
              "It needs another payment.",
              "It is canceled automatically."
            ],
            "answer": 0,
            "explanation": "Bài nghe nêu original booking remains valid unless you request a change."
          }
        ]
      },
      {
        "id": "a06",
        "title": "Tổng hợp: lịch trình, chi tiết và tự chữa lỗi",
        "objectives": [
          "Kết hợp hai nguồn thông tin ngắn",
          "Phân biệt lịch chung và ngoại lệ",
          "Tự ghi lỗi để chọn nội dung ôn"
        ],
        "prerequisites": [
          "a05"
        ],
        "minutes": 45,
        "knowledge": "Một bài tổng hợp thường yêu cầu bạn kết hợp kỹ năng đã học thay vì nhận ra một quy tắc riêng. Khi đọc lịch cùng ghi chú, hãy xác định phiên bản đang áp dụng và ngoại lệ. Một lịch nói cửa mở lúc chín nhưng ghi chú nói riêng thứ Sáu mở lúc mười không mâu thuẫn nếu thứ Sáu là ngoại lệ. Câu hỏi về thứ Sáu phải dùng ghi chú, không dùng giờ thường lệ.\n\nĐối với nghe, giữ lại người nói, mục đích và bước tiếp theo trong một khung ngắn. Tên người, ngày và giờ nên được ghi bằng từ khóa. Không chép từng câu vì tốc độ ghi có thể khiến bạn bỏ lỡ thay đổi sau từ but. Khi chưa biết một từ, dùng ngữ cảnh nhưng không tự tạo chi tiết không có trong bài. Với câu hỏi cần bằng chứng trực tiếp, ưu tiên câu đã nói rõ.\n\nBắt đầu luyện quản lý thời gian bằng cách đo thời gian thực tế, không ép mình vào một chuẩn tốc độ chưa phù hợp. Làm một lượt có mục tiêu rồi xem lại lỗi sau khi nộp. Nếu hết thời gian vì đọc đi đọc lại, tập tóm tắt mỗi đoạn trong một câu. Nếu sai do từ loại, quay lại bài a01. Nếu nhầm việc đã xong và việc sẽ làm, quay lại a02. Nếu hiểu từng câu nhưng sai bước tiếp theo, ôn a03 và a04.\n\nPhiếu tự chữa nên có bốn cột: câu hỏi, đáp án đã chọn, bằng chứng đúng và nguyên nhân sai. Chọn một lỗi quan trọng để luyện lại bằng ví dụ mới. Lần ôn cách quãng hãy trả lời trước khi mở giải thích. Kết quả một bài ngắn chỉ phản ánh phần nội dung đó; không lấy phần trăm đúng của bài này đổi sang thang TOEIC. Để biết tiến bộ, cần thêm bài tương đương nhưng chưa từng học và điều kiện làm nhất quán.",
        "examples": [
          {
            "prompt": "Lịch chung 9 giờ; ghi chú “On Friday, open at ten”.",
            "explanation": "Với câu hỏi về thứ Sáu, dùng10 giờ. Ghi chú nêu ngoại lệ cụ thể hơn lịch chung."
          },
          {
            "prompt": "Một câu sai do bỏ qua “unless”.",
            "explanation": "Ghi lỗi về điều kiện, tìm lại mệnh đề unless và thử diễn đạt “trừ khi” trước khi chọn lại đáp án."
          }
        ],
        "vocabulary": [
          {
            "word": "unless",
            "meaning": "trừ khi",
            "example": "Your booking stays active unless you cancel."
          },
          {
            "word": "schedule",
            "meaning": "lịch trình",
            "example": "Check the updated schedule."
          },
          {
            "word": "evidence",
            "meaning": "bằng chứng",
            "example": "Find evidence in the message."
          },
          {
            "word": "review",
            "meaning": "ôn, xem lại",
            "example": "Review your errors after the task."
          }
        ],
        "reading": "Community training schedule: Monday to Thursday, the study room opens at 9 a.m. On Friday, it opens at 10 a.m. Group practice starts thirty minutes after opening each day. On Friday only, Room D replaces the usual Room B because Room B is being cleaned.",
        "listening": "Hi, Emi. The team finished the draft yesterday. We planned to review it at two today, but the client asked for a morning call. Please join the review at eleven instead. I will send the draft before ten so you have time to read it.",
        "guided": [
          {
            "id": "q089",
            "kind": "reading",
            "prompt": "Buổi luyện nhóm thường bắt đầu sau khi mở cửa bao lâu?",
            "options": [
              "One hour",
              "Thirty minutes",
              "Two hours",
              "Ten minutes"
            ],
            "answer": 1,
            "explanation": "Group practice starts thirty minutes after opening."
          },
          {
            "id": "q090",
            "kind": "listening",
            "prompt": "Bản nháp đã hoàn thành khi nào?",
            "options": [
              "Tomorrow morning",
              "Yesterday",
              "At eleven today",
              "Before ten tomorrow"
            ],
            "answer": 1,
            "explanation": "The team finished the draft yesterday."
          },
          {
            "id": "q091",
            "kind": "knowledge",
            "prompt": "Sau khi làm sai, bước nào giúp kiểm tra hiểu bài?",
            "options": [
              "Skip every similar question.",
              "Explain the evidence before trying a new example.",
              "Immediately convert the percentage to TOEIC.",
              "Memorize only the answer letter."
            ],
            "answer": 1,
            "explanation": "Giải thích bằng chứng và thử ví dụ mới kiểm tra hiểu quy tắc thay vì học chữ cái."
          }
        ],
        "checkpoint": [
          {
            "id": "q092",
            "kind": "reading",
            "prompt": "Thứ Sáu, luyện nhóm bắt đầu lúc mấy giờ?",
            "options": [
              "9:00 a.m.",
              "9:30 a.m.",
              "10:30 a.m.",
              "10:00 a.m."
            ],
            "answer": 2,
            "explanation": "Thứ Sáu mở lúc 10 giờ; buổi luyện bắt đầu sau 30 phút, tức 10:30."
          },
          {
            "id": "q093",
            "kind": "reading",
            "prompt": "Thứ Sáu, buổi luyện dùng phòng nào?",
            "options": [
              "Room D",
              "Room B",
              "Room A",
              "Room C"
            ],
            "answer": 0,
            "explanation": "Ghi chú riêng Friday nói Room D replaces Room B."
          },
          {
            "id": "q094",
            "kind": "listening",
            "prompt": "Giờ review mới là lúc nào?",
            "options": [
              "Ten tomorrow",
              "Eleven today",
              "Two tomorrow",
              "Two today"
            ],
            "answer": 1,
            "explanation": "Câu “Please join the review at eleven instead” thay lịch hai giờ bằng mười một giờ hôm nay."
          },
          {
            "id": "q095",
            "kind": "listening",
            "prompt": "Bản nháp sẽ được gửi trước lúc nào?",
            "options": [
              "Nine tomorrow",
              "Two today",
              "Eleven tomorrow",
              "Ten today"
            ],
            "answer": 3,
            "explanation": "Bản nháp sẽ được gửi trước mười giờ hôm nay để người nhận đọc trước buổi review lúc mười một giờ."
          },
          {
            "id": "q096",
            "kind": "knowledge",
            "prompt": "Điền từ: “The draft ___ yesterday.”",
            "options": [
              "is completing",
              "will complete",
              "was completed",
              "complete"
            ],
            "answer": 2,
            "explanation": "Draft nhận hành động hoàn thành trong quá khứ, nên was completed."
          }
        ]
      }
    ]
  },
  {
    "id": "toeic-450-650",
    "title": "Phát triển kỹ năng",
    "band": "Mục tiêu 450–650",
    "description": "Chặng thử nghiệm cho người đã vững câu cơ bản: mệnh đề, paraphrase, ý định người nói, lịch và đọc nối nhiều văn bản.",
    "units": [
      {
        "id": "b01",
        "title": "Mệnh đề, bổ nghĩa và quan hệ logic",
        "objectives": [
          "Tìm mệnh đề chính trong câu dài",
          "Dùng mệnh đề quan hệ để nối đúng danh từ",
          "Phân biệt although và despite"
        ],
        "prerequisites": [],
        "minutes": 45,
        "knowledge": "Chặng này dành cho người đã đọc được câu đơn và hiểu các thông báo ngắn. Câu dài thường chứa nhiều thông tin bổ sung, nhưng vẫn có mệnh đề chính với chủ ngữ và động từ chính. Trong “The technician who repaired our printer will visit again”, bỏ tạm who repaired our printer sẽ còn “The technician will visit again”. Cụm quan hệ giúp xác định kỹ thuật viên nào; nó không làm technician đổi thành chủ ngữ số nhiều.\n\nWho thường thay cho người, which thường thay cho vật trong mệnh đề quan hệ. That có thể dùng trong nhiều mệnh đề xác định, nhưng không nên biến bài đầu thành việc chọn mọi biến thể nâng cao. Quan trọng là nhận ra danh từ được bổ nghĩa và vai trò còn thiếu trong mệnh đề. “The employee who manages bookings” cần một chủ ngữ sau danh từ employee; who đảm nhiệm vai trò đó. Đừng thêm một đại từ he không cần thiết vào cùng vị trí.\n\nPhân biệt liên từ theo sau bởi một mệnh đề và giới từ theo sau bởi danh từ hoặc cụm danh từ. “Although the train was late” có chủ ngữ the train và động từ was. “Despite the delay” chỉ có cụm danh từ the delay. Cả hai có thể diễn tả nhượng bộ nhưng không dùng chung một cấu trúc máy móc. Because và because of cũng khác tương tự: because + mệnh đề; because of + cụm danh từ.\n\nĐọc câu dài theo các khối nghĩa, không tìm động từ gần chỗ trống nhất rồi đoán. Tìm trước ai làm gì, sau đó thêm điều kiện, nguyên nhân hoặc phần bổ nghĩa. Khi chữa, viết lại câu thành hai câu ngắn để kiểm tra hiểu. Lần ôn sau thử nối lại bằng từ quan hệ hoặc liên từ phù hợp; giải thích vì sao cấu trúc cần mệnh đề hay danh từ.",
        "examples": [
          {
            "prompt": "The employee who manages bookings is on leave.",
            "explanation": "Mệnh đề who manages bookings bổ nghĩa employee. Mệnh đề chính là The employee is on leave."
          },
          {
            "prompt": "Although the road was closed, the courier arrived on time.",
            "explanation": "Although theo sau bởi mệnh đề có the road và was. Nếu dùng despite, cần đổi thành despite the road closure."
          }
        ],
        "vocabulary": [
          {
            "word": "courier",
            "meaning": "người, dịch vụ chuyển phát",
            "example": "The courier arrived before noon."
          },
          {
            "word": "closure",
            "meaning": "việc đóng cửa hoặc phong tỏa",
            "example": "The road closure caused a delay."
          },
          {
            "word": "on leave",
            "meaning": "đang nghỉ phép",
            "example": "The coordinator is on leave this week."
          },
          {
            "word": "handle",
            "meaning": "xử lý, phụ trách",
            "example": "Nora handles booking changes."
          }
        ],
        "reading": "The coordinator who usually handles room bookings is on leave this week. Although the office is busy, all requests will be processed within one working day. Nora, who joined the support team last month, will handle urgent changes. Include your booking number in every message.",
        "listening": "Although the loading entrance is temporarily closed, deliveries are continuing as scheduled. Drivers should use the east gate, which is beside the staff car park. The employee who checks delivery documents will meet drivers there until the repairs are finished.",
        "guided": [
          {
            "id": "q097",
            "kind": "knowledge",
            "prompt": "Mệnh đề chính của “The coordinator who handles bookings is away” là gì?",
            "options": [
              "The coordinator who.",
              "Who handles bookings.",
              "The coordinator is away.",
              "Bookings is away."
            ],
            "answer": 2,
            "explanation": "Bỏ phần bổ nghĩa who handles bookings, câu chính vẫn đủ chủ ngữ và động từ."
          },
          {
            "id": "q098",
            "kind": "reading",
            "prompt": "Nora xử lý loại yêu cầu nào?",
            "options": [
              "All supplier invoices",
              "Urgent booking changes",
              "All recruitment applications",
              "Printer repairs"
            ],
            "answer": 1,
            "explanation": "Bài đọc nói Nora will handle urgent changes trong ngữ cảnh room bookings."
          },
          {
            "id": "q099",
            "kind": "listening",
            "prompt": "Tài xế cần dùng cổng nào?",
            "options": [
              "The loading entrance",
              "The east gate",
              "The west gate",
              "The main reception door"
            ],
            "answer": 1,
            "explanation": "Bài nghe nói drivers should use the east gate."
          }
        ],
        "checkpoint": [
          {
            "id": "q100",
            "kind": "knowledge",
            "prompt": "Điền từ: “___ the delay, the courier arrived before noon.”",
            "options": [
              "Although",
              "Because",
              "While",
              "Despite"
            ],
            "answer": 3,
            "explanation": "Sau chỗ trống là cụm danh từ the delay; Despite phù hợp. Although cần mệnh đề."
          },
          {
            "id": "q101",
            "kind": "knowledge",
            "prompt": "Điền từ: “The assistant ___ checks the documents is waiting outside.”",
            "options": [
              "who",
              "when",
              "where",
              "which"
            ],
            "answer": 0,
            "explanation": "Assistant chỉ người và chỗ trống làm chủ ngữ của checks, nên who."
          },
          {
            "id": "q102",
            "kind": "reading",
            "prompt": "Mỗi tin nhắn về đặt phòng cần có thông tin gì?",
            "options": [
              "A car park map",
              "The courier’s name",
              "The booking number",
              "Nora’s start date"
            ],
            "answer": 2,
            "explanation": "Câu cuối yêu cầu include your booking number in every message."
          },
          {
            "id": "q103",
            "kind": "listening",
            "prompt": "Ai gặp tài xế ở cổng thay thế?",
            "options": [
              "The office cleaner",
              "The training instructor",
              "The employee who checks delivery documents",
              "The new coordinator"
            ],
            "answer": 2,
            "explanation": "Bài nghe chỉ rõ employee who checks delivery documents sẽ gặp tài xế ở đó."
          },
          {
            "id": "q104",
            "kind": "listening",
            "prompt": "Lịch giao hàng bị thay đổi như thế nào?",
            "options": [
              "All deliveries are canceled.",
              "Only afternoon deliveries continue.",
              "Deliveries continue as scheduled.",
              "Every delivery moves to next week."
            ],
            "answer": 2,
            "explanation": "Although nêu trở ngại nhưng mệnh đề chính khẳng định continuing as scheduled."
          }
        ]
      },
      {
        "id": "b02",
        "title": "Paraphrase và nghĩa của từ trong ngữ cảnh",
        "objectives": [
          "Nhận ra cách diễn đạt tương đương",
          "Giữ nguyên điều kiện, mức độ và thời gian",
          "Phân biệt nghĩa quen thuộc và nghĩa trong câu"
        ],
        "prerequisites": [
          "b01"
        ],
        "minutes": 45,
        "knowledge": "Paraphrase là diễn đạt lại cùng một ý bằng cấu trúc hoặc từ khác. “The fee includes delivery” có thể được viết lại là “Delivery is covered by the fee”. Điều cần giữ là quan hệ ý nghĩa, không phải từng chữ. “Delivery is free for every order” lại rộng hơn thông tin gốc vì có thể bỏ mất điều kiện hoặc phạm vi của khoản phí đang nói.\n\nKhi so sánh hai câu, kiểm tra người hoặc vật, hành động, thời gian, số lượng và mức chắc chắn. May không giống must; some không giống all; before không giống after. “Members may request a refund” cho phép yêu cầu, không đảm bảo mọi yêu cầu đều được chấp thuận. Một phương án dùng nhiều từ đồng nghĩa nhưng thay đổi điều kiện vẫn là sai.\n\nTừ vựng có thể thay đổi nghĩa theo ngữ cảnh. “The charge appears on the receipt” dùng charge là khoản phí; “charge the battery” lại là nạp điện. Đọc câu trước và sau, xác định từ loại và chủ đề, rồi thử thay bằng nghĩa dự đoán. Nếu toàn câu không còn hợp lý, cần xét lại. Tránh chọn nghĩa từ điển đầu tiên chỉ vì đã học nó trước đây.\n\nTrong bài đọc, tìm bằng chứng cho ý tương đương bằng một cụm hoàn chỉnh. Trong bài nghe, nhận ra cùng ý dù câu hỏi dùng từ khác: “collect” có thể tương ứng “pick up”, “postpone” với “move to a later date”. Khi ôn, viết một câu paraphrase và một câu gần giống nhưng sai điều kiện; chỉ ra phần làm thay đổi nghĩa. Cách luyện này giúp bạn kiểm tra hiểu ý chính xác thay vì chỉ lập danh sách từ đồng nghĩa rời rạc.",
        "examples": [
          {
            "prompt": "“You may collect the order after two” và “Pickup is available from two onward”.",
            "explanation": "Hai câu cho phép nhận từ2 giờ trở đi. “You must collect it at two” đổi quyền chọn thành bắt buộc và đổi khoảng thành một thời điểm."
          },
          {
            "prompt": "“The service charge is included in the total”.",
            "explanation": "Charge ở đây là khoản phí. Included nghĩa là đã nằm trong tổng tiền, không phải một khoản chắc chắn được thu thêm."
          }
        ],
        "vocabulary": [
          {
            "word": "postpone",
            "meaning": "hoãn sang thời điểm muộn hơn",
            "example": "We postponed the visit until Friday."
          },
          {
            "word": "collect",
            "meaning": "nhận, lấy",
            "example": "You can collect the order at reception."
          },
          {
            "word": "refund",
            "meaning": "hoàn tiền",
            "example": "Request a refund within seven days."
          },
          {
            "word": "charge",
            "meaning": "khoản phí",
            "example": "The receipt shows a delivery charge."
          }
        ],
        "reading": "Delivery policy: The standard price covers delivery within the city. Orders outside the city require an additional charge. Customers may request a refund for damaged items within seven days of delivery. Keep the receipt and send a photograph of the damage with the request.",
        "listening": "Your order is ready for pickup. You can collect it from the service desk after two this afternoon. Please bring your confirmation email. If you prefer delivery, contact us before noon; a delivery fee will apply.",
        "guided": [
          {
            "id": "q105",
            "kind": "knowledge",
            "prompt": "“The fee covers installation” gần nghĩa với câu nào?",
            "options": [
              "Installation is included in the fee.",
              "Every service is free.",
              "Installation is canceled.",
              "Installation always costs extra."
            ],
            "answer": 0,
            "explanation": "Covers chỉ bao gồm chi phí lắp đặt, không khẳng định mọi dịch vụ miễn phí."
          },
          {
            "id": "q106",
            "kind": "reading",
            "prompt": "Giá tiêu chuẩn bao gồm giao hàng trong phạm vi nào?",
            "options": [
              "Outside the city only",
              "Everywhere in the country",
              "Within the city",
              "Only damaged items"
            ],
            "answer": 2,
            "explanation": "Bài đọc ghi within the city, ngoài thành phố có khoản phí bổ sung."
          },
          {
            "id": "q107",
            "kind": "listening",
            "prompt": "“Ready for pickup” có nghĩa gì trong bài nghe?",
            "options": [
              "Waiting for repair",
              "Available to be collected",
              "Already delivered to the home",
              "Canceled by the customer"
            ],
            "answer": 1,
            "explanation": "Pickup là việc khách đến nhận hàng, không phải đã giao tận nhà."
          }
        ],
        "checkpoint": [
          {
            "id": "q108",
            "kind": "knowledge",
            "prompt": "Câu nào giữ đúng nghĩa “Members may request a refund”?",
            "options": [
              "Members are allowed to ask for a refund.",
              "Members must request a refund.",
              "Every member will receive a refund.",
              "Refunds are never available."
            ],
            "answer": 0,
            "explanation": "May request diễn tả được phép yêu cầu, không bảo đảm kết quả hay bắt buộc."
          },
          {
            "id": "q109",
            "kind": "reading",
            "prompt": "Điều kiện thời gian để yêu cầu hoàn tiền hàng hỏng là gì?",
            "options": [
              "Before placing the order",
              "Only after one month",
              "Within seven days of delivery",
              "Exactly seven days before delivery"
            ],
            "answer": 2,
            "explanation": "Bài đọc quy định trong vòng bảy ngày kể từ khi giao hàng."
          },
          {
            "id": "q110",
            "kind": "reading",
            "prompt": "Ngoài hóa đơn, yêu cầu hoàn tiền cần kèm gì?",
            "options": [
              "A city map",
              "A new order form",
              "A photograph of the damage",
              "A staff access card"
            ],
            "answer": 2,
            "explanation": "Keep the receipt and send a photograph of the damage."
          },
          {
            "id": "q111",
            "kind": "listening",
            "prompt": "Nếu muốn giao hàng thay vì đến nhận, khách cần liên hệ khi nào?",
            "options": [
              "Next week",
              "At closing time",
              "After two",
              "Before noon"
            ],
            "answer": 3,
            "explanation": "Giờ nhận hàng là sau hai giờ, còn hạn liên hệ để yêu cầu giao hàng là trước trưa."
          },
          {
            "id": "q112",
            "kind": "vocabulary",
            "prompt": "Trong “an additional charge”, charge nghĩa là gì?",
            "options": [
              "An extra fee",
              "A sales target",
              "A delivery box",
              "An electrical cable"
            ],
            "answer": 0,
            "explanation": "Ngữ cảnh chính sách giao hàng dùng charge là khoản phí."
          }
        ]
      },
      {
        "id": "b03",
        "title": "Hội thoại: ý định và suy luận có giới hạn",
        "objectives": [
          "Suy ra ý định từ lượt lời trước và sau",
          "Phân biệt vấn đề, đề xuất và cam kết",
          "Tránh suy luận về thông tin chưa được cung cấp"
        ],
        "prerequisites": [
          "b02"
        ],
        "minutes": 45,
        "knowledge": "Một câu như “The room is getting crowded” có thể là nhận xét, lời giải thích hoặc cách đề nghị chuyển phòng. Ý định phụ thuộc vào các lượt lời xung quanh. Nếu câu trước hỏi có nên nhận thêm khách và câu sau thống nhất ngừng đăng ký, nhận xét đó hỗ trợ việc giới hạn số người. Không dùng một cách hiểu cố định cho mọi tình huống.\n\nĐể trả lời câu hỏi ý định, tìm việc người nói muốn đối phương hiểu hoặc làm. Xem người nghe phản hồi ra sao; câu đáp thường xác nhận chức năng của câu trước. Tuy nhiên, phản hồi không cho phép suy ra mọi thông tin về cảm xúc, nghề nghiệp hay quá khứ. Một người nói “I can check” chỉ nhận nhiệm vụ kiểm tra; chưa chứng minh họ đã biết đáp án.\n\nVới suy luận về bước tiếp theo, phân biệt khả năng, điều kiện và cam kết. “If the room is free, I will book it” có điều kiện. “I have booked it” là việc đã làm. “I will call and check now” là hành động tiếp theo rõ nhất. Cần giữ đúng đại từ và chủ thể: người đề xuất có thể khác người thực hiện. Những từ instead, otherwise và actually thường đổi hướng quyết định.\n\nLuyện nghe theo chuỗi ngắn: vấn đề nào xuất hiện, phương án nào được đề xuất, điều kiện gì còn thiếu, ai nhận làm việc gì. Sau mỗi câu suy luận, chỉ ra ít nhất một chi tiết hỗ trợ và một giới hạn điều chưa biết. Không chọn phương án chỉ vì đó là giải pháp hợp lý ngoài đời. Khi ôn, đổi một lượt đáp trong hội thoại rồi xem bước tiếp theo có thay đổi không; cách này kiểm tra bạn hiểu quan hệ hội thoại thay vì thuộc một câu khóa.",
        "examples": [
          {
            "prompt": "“Can we add five more guests?” — “There are no chairs left.”",
            "explanation": "Trong ngữ cảnh này, người đáp nêu hạn chế chỗ ngồi. Không đủ bằng chứng nói buổi gặp đã bị hủy."
          },
          {
            "prompt": "“If Room E is free, we can move.” — “I will check the booking page now.”",
            "explanation": "Hành động chắc chắn tiếp theo là kiểm tra lịch, chưa phải chuyển phòng; điều kiện phòng trống chưa được xác nhận."
          }
        ],
        "vocabulary": [
          {
            "word": "capacity",
            "meaning": "sức chứa",
            "example": "The room has a capacity of thirty."
          },
          {
            "word": "confirm",
            "meaning": "xác nhận",
            "example": "Please confirm whether the room is free."
          },
          {
            "word": "otherwise",
            "meaning": "nếu không thì",
            "example": "Book early; otherwise, seats may run out."
          },
          {
            "word": "extend",
            "meaning": "kéo dài, gia hạn",
            "example": "Can we extend the session by ten minutes?"
          }
        ],
        "reading": "Event note: Room E seats thirty people. Room F seats forty-five. Moving an event requires confirmation from the facilities team. The booking page shows available times, but a move is not final until the team sends a confirmation email.",
        "listening": "A: Another ten people want to join the workshop. B: Room E is already at capacity. A: Could we use Room F instead? B: Possibly, but we need facilities to confirm it. I will call them now. A: Thanks. I will wait before telling the extra guests that they can attend.",
        "guided": [
          {
            "id": "q113",
            "kind": "listening",
            "prompt": "“Room E is already at capacity” được nói để chỉ điều gì?",
            "options": [
              "The facilities team canceled the event.",
              "The workshop has already ended.",
              "Room F is fully booked.",
              "The current room cannot take more participants."
            ],
            "answer": 3,
            "explanation": "Câu này phản hồi yêu cầu thêm mười người bằng thông tin phòng hiện tại đã đầy."
          },
          {
            "id": "q114",
            "kind": "reading",
            "prompt": "Ai cần xác nhận việc chuyển phòng?",
            "options": [
              "The facilities team",
              "Every guest",
              "The catering team",
              "The delivery driver"
            ],
            "answer": 0,
            "explanation": "Bài đọc nêu moving an event requires confirmation from facilities."
          },
          {
            "id": "q115",
            "kind": "knowledge",
            "prompt": "Từ possibly trong hội thoại thể hiện điều gì?",
            "options": [
              "An absolute refusal",
              "A completed move",
              "A confirmed booking",
              "A possibility that still needs confirmation"
            ],
            "answer": 3,
            "explanation": "Possibly cùng but we need ... cho biết chưa có quyết định chắc chắn."
          }
        ],
        "checkpoint": [
          {
            "id": "q116",
            "kind": "listening",
            "prompt": "Người nói B sẽ làm gì tiếp theo?",
            "options": [
              "Email every extra guest",
              "Cancel the workshop",
              "Move all chairs to Room F",
              "Call the facilities team"
            ],
            "answer": 3,
            "explanation": "I will call them now; them chỉ facilities."
          },
          {
            "id": "q117",
            "kind": "listening",
            "prompt": "Người nói A sẽ làm gì trong khi chờ?",
            "options": [
              "Book a different workshop",
              "Promise seats to all extra guests",
              "Print a confirmation email",
              "Wait before confirming attendance to the extra guests"
            ],
            "answer": 3,
            "explanation": "Lượt cuối nói wait before telling ... they can attend."
          },
          {
            "id": "q118",
            "kind": "reading",
            "prompt": "Khi nào việc chuyển phòng mới được coi là hoàn tất?",
            "options": [
              "Whenever a time appears on the booking page",
              "When guests request more seats",
              "When facilities sends a confirmation email",
              "When Room E reaches capacity"
            ],
            "answer": 2,
            "explanation": "Chưa có email của facilities thì việc chuyển phòng chưa hoàn tất. Thời gian trống trên trang chỉ là một bước kiểm tra."
          },
          {
            "id": "q119",
            "kind": "reading",
            "prompt": "Sức chứa Room F lớn hơn Room E bao nhiêu?",
            "options": [
              "Ten people",
              "Forty-five people",
              "Thirty people",
              "Fifteen people"
            ],
            "answer": 3,
            "explanation": "Room F chứa 45 người và Room E chứa 30 người; chênh lệch là 15, khác với mười khách xin thêm trong hội thoại."
          },
          {
            "id": "q120",
            "kind": "knowledge",
            "prompt": "Kết luận nào chưa có đủ bằng chứng từ hội thoại?",
            "options": [
              "B plans to call facilities.",
              "Extra guests have asked to join.",
              "Room E is already full.",
              "Room F has been confirmed for the workshop."
            ],
            "answer": 3,
            "explanation": "Chưa nhận xác nhận từ facilities. Khả năng chuyển sang Room F không đồng nghĩa việc chuyển đã được xác nhận."
          }
        ]
      },
      {
        "id": "b04",
        "title": "Thông báo và lịch: lọc đúng chi tiết",
        "objectives": [
          "Theo dõi thay đổi trong thông báo dài hơn",
          "Kết hợp lời nói với lịch chữ",
          "Xác định hành động của đúng nhóm người"
        ],
        "prerequisites": [
          "b03"
        ],
        "minutes": 45,
        "knowledge": "Thông báo có nhiều số và nhiều nhóm người dễ gây nhầm dù từng câu không khó. Trước khi nghe, xác định câu hỏi đang nói tới nhân viên mới, khách đã đăng ký hay người chưa nộp hồ sơ. Một hướng dẫn có thể chỉ áp dụng cho một nhóm. Không lấy yêu cầu dành cho người đến muộn áp cho tất cả người nghe.\n\nNếu có lịch hoặc bảng, đọc tiêu đề, tên cột và đơn vị trước. Dòng nào là giờ bắt đầu, dòng nào là địa điểm, dòng nào là hạn xác nhận? Khi nghe thông báo đổi lịch, đánh dấu thông tin mới bên cạnh dòng liên quan. Một số được nhắc trong bài nghe có thể là số phòng chứ không phải số phút. Không chọn đáp án chỉ vì nhìn thấy cùng một con số trên lịch.\n\nTheo dõi các tín hiệu sửa đổi như instead of, moved from ... to ..., now và remains unchanged. “The safety session moves to eleven; the building tour stays at ten” chỉ đổi một hoạt động. Không tự dịch chuyển mọi hoạt động sau đó. Những câu yêu cầu bằng please, make sure và remember thường xuất hiện gần cuối; giữ sự chú ý đến hết thông báo.\n\nKhi luyện, nghe lần đầu để nắm mục đích và nhóm người, lần sau kiểm tra lịch cụ thể. Chỉ mở bản lời sau khi đã thử trả lời, nếu thiết bị hỗ trợ nghe. Bản lời giúp phân tích ngôn ngữ nhưng việc đọc nó không phải bằng chứng độc lập của năng lực nghe. Sau khi chữa, tạo lịch cuối cùng chỉ có thông tin đang hiệu lực. Trong lần ôn sau, đổi một giờ hoặc một phòng và tự cập nhật lại; đây là cách luyện theo thông tin, không học thuộc vị trí đáp án.",
        "examples": [
          {
            "prompt": "“The tour remains at ten, but the briefing moves to eleven.”",
            "explanation": "Chỉ briefing đổi. Tour vẫn10 giờ; but phân tách phần giữ nguyên với phần thay đổi."
          },
          {
            "prompt": "Cột “Room” có số204 và cột “Start” có10:30.",
            "explanation": "204 là mã phòng, không phải thời lượng. Phải hiểu nhãn cột trước khi kết hợp với lời nghe."
          }
        ],
        "vocabulary": [
          {
            "word": "orientation",
            "meaning": "buổi định hướng",
            "example": "New staff attend orientation on Monday."
          },
          {
            "word": "remain",
            "meaning": "giữ nguyên",
            "example": "The start time will remain unchanged."
          },
          {
            "word": "session",
            "meaning": "buổi học, phiên làm việc",
            "example": "The second session starts at eleven."
          },
          {
            "word": "collect",
            "meaning": "nhận, lấy",
            "example": "Collect your badge before the tour."
          }
        ],
        "reading": "New-staff orientation — original schedule: 9:00 Welcome, Room A; 10:00 Building tour, Lobby; 11:00 Safety session, Room B; 12:00 Lunch, Cafe. Written update: The safety session will take place in Room D instead of Room B. All start times remain unchanged. Collect your badge at the lobby desk before the building tour.",
        "listening": "Welcome to Monday orientation. The welcome session starts at nine in Room A, as planned. The building tour will now begin at ten thirty because the guide is delayed. The safety session will still start at eleven in Room D. Please collect your badge before joining the tour. Staff who have already collected a badge do not need to queue again.",
        "guided": [
          {
            "id": "q121",
            "kind": "reading",
            "prompt": "Theo cập nhật bằng văn bản, phòng học an toàn đổi thành gì?",
            "options": [
              "Room A",
              "Room D",
              "The cafe",
              "Room B"
            ],
            "answer": 1,
            "explanation": "Cập nhật bằng văn bản thay Room B bằng Room D và giữ nguyên giờ bắt đầu."
          },
          {
            "id": "q122",
            "kind": "listening",
            "prompt": "Vì sao giờ tham quan tòa nhà thay đổi?",
            "options": [
              "Badges are missing.",
              "Room A is closed.",
              "The guide is delayed.",
              "The cafe is full."
            ],
            "answer": 2,
            "explanation": "Bài nghe nêu because the guide is delayed."
          },
          {
            "id": "q123",
            "kind": "knowledge",
            "prompt": "“All start times remain unchanged” nghĩa là gì?",
            "options": [
              "All rooms stay the same.",
              "No start times change in that written update.",
              "The tour begins early.",
              "Every session is canceled."
            ],
            "answer": 1,
            "explanation": "Chỉ nói thời gian không đổi; không phủ nhận việc đổi phòng."
          }
        ],
        "checkpoint": [
          {
            "id": "q124",
            "kind": "listening",
            "prompt": "Theo thông báo nghe mới nhất, tour bắt đầu lúc nào?",
            "options": [
              "10:30",
              "11:00",
              "9:00",
              "10:00"
            ],
            "answer": 0,
            "explanation": "“Will now begin at ten thirty” thay giờ gốc mười giờ bằng 10:30."
          },
          {
            "id": "q125",
            "kind": "listening",
            "prompt": "Buổi an toàn bắt đầu lúc mấy giờ theo bài nghe?",
            "options": [
              "12:00",
              "11:00",
              "9:00",
              "10:30"
            ],
            "answer": 1,
            "explanation": "Will still start at eleven giữ nguyên giờ dù tour bị chậm."
          },
          {
            "id": "q126",
            "kind": "reading",
            "prompt": "Theo lịch gốc, buổi chào mừng diễn ra ở đâu?",
            "options": [
              "Lobby",
              "Room D",
              "Room A",
              "Cafe"
            ],
            "answer": 2,
            "explanation": "Dòng Welcome lúc 9:00 trong lịch gốc ghi Room A."
          },
          {
            "id": "q127",
            "kind": "listening",
            "prompt": "Ai không cần xếp hàng nhận thẻ lần nữa?",
            "options": [
              "Only tour guides",
              "All new staff",
              "Anyone who arrives at eleven",
              "Staff who have already collected a badge"
            ],
            "answer": 3,
            "explanation": "Câu cuối loại nhóm đã nhận thẻ khỏi yêu cầu xếp hàng lại."
          },
          {
            "id": "q128",
            "kind": "knowledge",
            "prompt": "Muốn xác định thời gian cuối cùng của tour, phải làm gì?",
            "options": [
              "Ignore the update because the original is written.",
              "Use the room number as the time.",
              "Use the later spoken update for that activity.",
              "Shift every later session by thirty minutes."
            ],
            "answer": 2,
            "explanation": "Thông báo nghe mới cập nhật riêng tour; không tự đổi các phiên khác."
          }
        ]
      },
      {
        "id": "b05",
        "title": "Đọc nhiều văn bản và nối bằng chứng",
        "objectives": [
          "Nối email với bảng và thông báo",
          "Tìm đối tượng chung qua mã hoặc tên",
          "Suy luận chỉ từ thông tin có thể kiểm chứng"
        ],
        "prerequisites": [
          "b04"
        ],
        "minutes": 45,
        "knowledge": "Ở bài nhiều văn bản, một câu hỏi có thể cần thông tin từ hai nguồn. Trước hết xác định chức năng của từng văn bản: email yêu cầu, bảng tùy chọn hay thư xác nhận. Tìm cầu nối như mã đơn, tên phòng, ngày hoặc mã sản phẩm. Không ghép hai hàng trong bảng chỉ vì tên của chúng gần giống nhau.\n\nPhân biệt yêu cầu ban đầu và phương án được xác nhận sau cùng. Một khách muốn gói có ăn trưa nhưng thư sau nói đổi sang gói không ăn trưa thì kế hoạch cuối phải theo xác nhận. Những từ approved, confirmed, revised và instead giúp theo dõi thay đổi. Ghi ngắn thông tin cuối cùng ở mỗi nguồn rồi kiểm tra chúng có liên hệ cùng đối tượng hay không.\n\nVới suy luận, kết hợp các dữ kiện đã có mà không bổ sung giả định. Nếu bảng ghi gói Core không gồm tài liệu in và email xác nhận khách chọn Core, có thể kết luận gói đã chọn không bao gồm tài liệu in. Không thể kết luận khách không bao giờ nhận được giấy vì họ có thể mua thêm nếu tài liệu khác chưa nói tới. Câu hỏi cần được hiểu trong phạm vi đơn hàng hoặc gói hiện tại.\n\nQuy trình là đọc câu hỏi, tìm nguồn liên quan, đối chiếu mã/tên và kiểm chứng từng phần của đáp án. Tránh đọc đi đọc lại toàn bộ ba văn bản khi câu hỏi chỉ cần một chi tiết. Khi chữa, ghi rõ nguồn thứ nhất cung cấp gì và nguồn thứ hai bổ sung gì. Lần ôn sau thử giải thích đáp án cho người khác mà không dùng cụm “vì đáp án là thế”. Nếu không chỉ được hai bằng chứng cần nối, hãy học lại bước xác định cầu nối trước khi tăng độ dài bài.",
        "examples": [
          {
            "prompt": "Bảng: Core không có bữa trưa. Email: khách xác nhận chọn Core.",
            "explanation": "Có thể kết luận gói khách vừa chọn không bao gồm bữa trưa. Không suy ra người đó sẽ không ăn trưa bằng cách khác."
          },
          {
            "prompt": "Yêu cầu ghi mãR21; thư xác nhận cũng ghi mãR21.",
            "explanation": "Mã chung là cầu nối chắc hơn việc hai email cùng nhắc “training”. Kiểm tra mã trước khi kết hợp chi tiết."
          }
        ],
        "vocabulary": [
          {
            "word": "package",
            "meaning": "gói dịch vụ",
            "example": "The Core package includes online materials."
          },
          {
            "word": "confirmation",
            "meaning": "sự, thư xác nhận",
            "example": "Please keep the confirmation email."
          },
          {
            "word": "revised",
            "meaning": "được chỉnh sửa",
            "example": "The revised order lists twelve guests."
          },
          {
            "word": "include",
            "meaning": "bao gồm",
            "example": "The price does not include lunch."
          }
        ],
        "reading": "Text 1 — Package list: Core: workshop entry and online materials, $40 per person. Plus: workshop entry, online materials and lunch, $55 per person. Printed materials cost an extra $5 per person for either package.\n\nText 2 — Request R21 from Juno: Please book Plus for ten participants on 18 June. We do not need printed materials.\n\nText 3 — Confirmation R21: As requested in your follow-up call, your revised booking is Core for twelve participants on 18 June. Online materials will be emailed the day before. No printed materials have been added.",
        "listening": "Hello, Juno. I am calling about booking R21. We have confirmed twelve Core places for the eighteenth of June. The original request included lunch, but the revised package does not. If any participant needs a printed workbook, please tell us by the fifteenth so we can add the extra charge.",
        "guided": [
          {
            "id": "q129",
            "kind": "reading",
            "prompt": "Mã nào nối yêu cầu và xác nhận?",
            "options": [
              "Core",
              "R21",
              "June",
              "Plus"
            ],
            "answer": 1,
            "explanation": "Cả Text 2 và Text 3 đều mang mã R21 để xác định cùng một đặt chỗ."
          },
          {
            "id": "q130",
            "kind": "reading",
            "prompt": "Gói Plus có thêm gì so với Core theo bảng?",
            "options": [
              "Lunch",
              "Printed materials included",
              "Online materials",
              "Workshop entry"
            ],
            "answer": 0,
            "explanation": "Cả hai gói có workshop entry và online materials; chỉ Plus gồm lunch. Bản in đều tính thêm phí."
          },
          {
            "id": "q131",
            "kind": "listening",
            "prompt": "Hạn báo nhu cầu workbook in là ngày nào?",
            "options": [
              "15 June",
              "18 June",
              "12 June",
              "17 June"
            ],
            "answer": 0,
            "explanation": "Bài nghe nói “by the fifteenth” trong ngữ cảnh workshop ngày 18 June, tức hạn ngày 15 June."
          }
        ],
        "checkpoint": [
          {
            "id": "q132",
            "kind": "reading",
            "prompt": "Theo xác nhận cuối, có bao nhiêu người tham gia?",
            "options": [
              "Eighteen",
              "Fifteen",
              "Twelve",
              "Ten"
            ],
            "answer": 2,
            "explanation": "Text 3 là xác nhận đã sửa cho mười hai người, thay số mười người của yêu cầu ban đầu."
          },
          {
            "id": "q133",
            "kind": "reading",
            "prompt": "Gói được xác nhận cuối cùng có gồm ăn trưa không?",
            "options": [
              "No, the confirmed Core package does not include lunch.",
              "No package list is provided.",
              "Yes, because Plus was requested first.",
              "Yes, because printed materials were declined."
            ],
            "answer": 0,
            "explanation": "Text 3 xác nhận gói Core; bảng trong Text 1 cho thấy chỉ Plus bao gồm bữa trưa."
          },
          {
            "id": "q134",
            "kind": "reading",
            "prompt": "Tổng tiền cơ bản của đặt chỗ đã xác nhận, chưa thêm bản in, là bao nhiêu?",
            "options": [
              "$480",
              "$400",
              "$660",
              "$550"
            ],
            "answer": 0,
            "explanation": "Gói Core có giá 40 USD mỗi người; mười hai người là 480 USD. Không dùng giá Plus hay số người trong yêu cầu cũ."
          },
          {
            "id": "q135",
            "kind": "listening",
            "prompt": "Nếu cần workbook in, người tham gia nên làm gì?",
            "options": [
              "Tell the organizer by the stated deadline",
              "Assume it is included for free",
              "Change to Plus automatically",
              "Wait until the day after the workshop"
            ],
            "answer": 0,
            "explanation": "Bài nghe yêu cầu báo trước ngày 15 để bổ sung phí workbook; bản in không được mặc định cung cấp miễn phí."
          },
          {
            "id": "q136",
            "kind": "knowledge",
            "prompt": "Khi yêu cầu và xác nhận khác nhau, thông tin nào mô tả đặt chỗ hiện tại?",
            "options": [
              "The revised confirmation for the same booking number",
              "Any package with the highest price",
              "The first request regardless of updates",
              "A different customer’s confirmation"
            ],
            "answer": 0,
            "explanation": "Dùng bản xác nhận đã sửa và kiểm tra cùng mã đặt chỗ; yêu cầu đầu tiên không còn mô tả đầy đủ thay đổi sau đó."
          }
        ]
      },
      {
        "id": "b06",
        "title": "Tổng hợp chuyển giao và kế hoạch ôn tiếp",
        "objectives": [
          "Làm bài hỗn hợp với điều kiện rõ ràng",
          "Giữ đúng bằng chứng và điều kiện khi suy luận",
          "Tự chọn nội dung cần củng cố sau chặng"
        ],
        "prerequisites": [
          "b05"
        ],
        "minutes": 45,
        "knowledge": "Bài cuối chặng giúp kiểm tra khả năng dùng kiến thức trong ngữ cảnh mới, không chỉ nhận ra dạng câu từng làm. Trước khi bắt đầu, chọn một khoảng thời gian học thực tế và tắt các hỗ trợ mà bạn muốn tự đánh giá. Phần học có giải thích và phần kiểm tra nên được làm ở các thời điểm riêng. Nếu đã xem bản lời nghe, kết quả câu nghe của lần đó không còn là một phép đo nghe độc lập.\n\nTrong lượt làm đầu, đọc yêu cầu chính xác: câu hỏi hỏi lịch cũ, lịch mới, mục đích hay điều được suy ra? Đối chiếu mỗi câu trả lời với bằng chứng. Chỉ chọn suy luận mạnh nhất trong phạm vi văn bản; đừng biến khả năng thành chắc chắn hoặc một điều kiện thành một sự kiện đã hoàn thành. Câu dài vẫn cần được tách chủ ngữ, động từ và phần bổ nghĩa trước khi quyết định từ loại hoặc liên từ.\n\nSau khi nộp, phân loại lỗi theo gốc: từ loại, mốc thời gian, quan hệ logic, paraphrase, theo dõi lượt nói hoặc nối nhiều nguồn. Xem một ví dụ mẫu ở bài tương ứng, tự giải một ví dụ khác rồi giải thích vì sao đáp án đúng. Nếu đáp đúng do đoán, vẫn ghi nội dung đó để ôn. Một lần đúng chưa đủ chứng minh giữ được kiến thức lâu dài.\n\nLần ôn kế tiếp cần bắt đầu bằng tự trả lời, sau đó mới mở tài liệu. Lịch ôn có thể thay đổi theo mức nhớ, thời gian rảnh và lượng bài đã đến hạn. Đừng bỏ hẳn phần đã khá; giữ một ít bài duy trì để kiểm tra sau khoảng nghỉ. Hoàn thành chặng này chỉ cho biết đã học các chủ điểm thử nghiệm của hệ thống. Điểm TOEIC thực tế cần đánh giá bằng công cụ phù hợp, độc lập với câu đã luyện, và không được suy ra trực tiếp từ xác suất của mô hình hay phần trăm đúng ở đây.",
        "examples": [
          {
            "prompt": "“A room may become available” không đồng nghĩa “A room is confirmed”.",
            "explanation": "May biểu thị khả năng. Chỉ khi có xác nhận mới được kết luận phòng đã được giữ."
          },
          {
            "prompt": "Đúng4/5câu trong một quiz tự soạn.",
            "explanation": "Có thể ghi nhận80% trên 5 câu đó, nhưng không được đổi thành80% của 990 hay khẳng định năng lực toàn bài thi."
          }
        ],
        "vocabulary": [
          {
            "word": "provisional",
            "meaning": "tạm thời, chưa xác nhận cuối",
            "example": "The timetable is provisional until Friday."
          },
          {
            "word": "approve",
            "meaning": "phê duyệt",
            "example": "The manager will approve the change."
          },
          {
            "word": "retain",
            "meaning": "giữ lại, ghi nhớ",
            "example": "Delayed practice helps check what you retain."
          },
          {
            "word": "independent",
            "meaning": "độc lập",
            "example": "Use an independent test to evaluate progress."
          }
        ],
        "reading": "Subject: Revised training visit. Our visit to the service center was originally planned for 9 a.m. on 22 July. It is now confirmed for 10 a.m. on the same date because the trainers have a morning briefing. Please arrive fifteen minutes early and bring the checklist attached to this message. The checklist replaces the version sent last week.",
        "listening": "A: Are all the workshop materials ready? B: The online files are ready, but the printed guides have not arrived. A: Could we postpone the start? B: The guests are already traveling. I suggest opening with the online demonstration. A: That works. I will prepare the screen, and please ask the supplier for a delivery update.",
        "guided": [
          {
            "id": "q137",
            "kind": "reading",
            "prompt": "Vì sao chuyến thăm bắt đầu muộn hơn lịch ban đầu?",
            "options": [
              "The trainers have a morning briefing.",
              "The service center is closed all day.",
              "The checklist is missing.",
              "Guests are traveling."
            ],
            "answer": 0,
            "explanation": "Bài đọc nêu lý do sau because; lý do trong bài nghe không áp sang email."
          },
          {
            "id": "q138",
            "kind": "listening",
            "prompt": "Nhóm còn thiếu tài liệu gì?",
            "options": [
              "The printed guides",
              "The booking confirmation",
              "The attached checklist",
              "The online files"
            ],
            "answer": 0,
            "explanation": "Online files ready nhưng printed guides have not arrived."
          },
          {
            "id": "q139",
            "kind": "knowledge",
            "prompt": "Điều nào phù hợp khi đánh giá sau một quiz ngắn?",
            "options": [
              "Assume every skill is mastered",
              "Multiply the percentage by 990 to get a certified score",
              "Discard all future reviews after one pass",
              "Treat the result as evidence about those items, not an official TOEIC score"
            ],
            "answer": 3,
            "explanation": "Quiz tự soạn chỉ đo các câu đã làm và chưa được hiệu chỉnh theo thang TOEIC chính thức."
          }
        ],
        "checkpoint": [
          {
            "id": "q140",
            "kind": "reading",
            "prompt": "Người tham gia cần đến lúc mấy giờ theo email mới?",
            "options": [
              "9:45 a.m.",
              "8:45 a.m.",
              "9:00 a.m.",
              "10:15 a.m."
            ],
            "answer": 0,
            "explanation": "Lịch mới bắt đầu lúc 10 giờ và yêu cầu đến sớm 15 phút, nên cần đến lúc 9:45. Không dùng lịch cũ 9 giờ."
          },
          {
            "id": "q141",
            "kind": "reading",
            "prompt": "Nên dùng checklist nào?",
            "options": [
              "Any older checklist",
              "The version sent last week",
              "Only the supplier’s delivery list",
              "The one attached to the revised message"
            ],
            "answer": 3,
            "explanation": "Email nói checklist đính kèm thay thế phiên bản gửi tuần trước."
          },
          {
            "id": "q142",
            "kind": "listening",
            "prompt": "Nhóm đã thống nhất bắt đầu workshop bằng gì?",
            "options": [
              "A new guest registration",
              "A postponed start",
              "The printed guide review",
              "The online demonstration"
            ],
            "answer": 3,
            "explanation": "Đề xuất mở đầu bằng online demonstration được chấp nhận bằng “That works”."
          },
          {
            "id": "q143",
            "kind": "listening",
            "prompt": "Người nói B được yêu cầu làm gì tiếp theo?",
            "options": [
              "Cancel the visit",
              "Print last week’s checklist",
              "Ask the supplier for a delivery update",
              "Prepare the screen"
            ],
            "answer": 2,
            "explanation": "A nhận chuẩn bị màn hình và yêu cầu B hỏi nhà cung cấp. Cần phân biệt người thực hiện hai hành động."
          },
          {
            "id": "q144",
            "kind": "knowledge",
            "prompt": "Điền từ: “Although the guides ___ late, the session began on time.”",
            "options": [
              "were",
              "was",
              "is",
              "be"
            ],
            "answer": 0,
            "explanation": "Guides là danh từ số nhiều; began cho thấy bối cảnh quá khứ, nên dùng were."
          }
        ]
      }
    ]
  },
  ADVANCED_650_TRACK,
  ADVANCED_800_TRACK,
];
