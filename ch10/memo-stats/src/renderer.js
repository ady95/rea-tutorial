const input = document.querySelector("#memo");
const output = document.querySelector("#result");

document.querySelector("#analyze").addEventListener("click", async () => {
  const stats = await window.memo.summarize(input.value);
  const tags = stats.tags.map((t) => `#${t.tag}(${t.count})`).join(" ");
  output.textContent =
    `${stats.lines}줄 · ${stats.words}단어 · ` +
    `약 ${stats.readingMinutes}분 · ${tags}`;
});
