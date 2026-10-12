// 05-2: notes-example/csv.js 의 toCsv 출력 형식 확인용
// 사용: C:/rea-labs/notes-example 폴더에 복사한 뒤 node try-csv.js
const { toCsv } = require("./csv.js");
process.stdout.write(toCsv([{ id: 1, title: 'Hello, "REA"' }, { id: 2, title: "second" }]));
