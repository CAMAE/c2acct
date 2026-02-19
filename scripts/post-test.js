const fetch = require("node-fetch");

(async () => {
  const res = await fetch("http://localhost:3000/api/survey/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      moduleId: "cmlrkls5q0000tkmxf2ayr55x",
      companyId: "cmlrmcg350000yxggnfdbpx3p",
      answers: {
        cmlrlmeth00011uwrzre2qy14: 3,
        cmlrlmeu700031uwrohnbvf22: 3,
        cmlrlmeui00051uwr2l1121og: 3
      }
    })
  });

  const text = await res.text();
  console.log("STATUS:", res.status);
  console.log("RAW:", text);

  try { console.log("JSON:", JSON.parse(text)); } catch {}
})();
