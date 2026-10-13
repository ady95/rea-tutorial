// 05-2: notes-example/csv.js 의 toCsv 출력 형식 확인용
// 사용: C:/rea-labs 에 복사한 뒤(notes-example 폴더 안이 아님) node try-csv.js
// 예제 폴더 안에 두면 REA 분석 수치(파일 6개, JS 4개)가 달라진다.
const { toCsv } = require("./notes-example/csv.js");
process.stdout.write(toCsv([{ id: 1, title: 'Hello, "REA"' }, { id: 2, title: "second" }]));
