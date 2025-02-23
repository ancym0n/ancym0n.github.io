let timeElement = document.querySelector("#time");
let msToMin = 60 * 1000;
function setTime() {
  let polishTime = new Date().toLocaleTimeString("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  timeElement.textContent = polishTime;
}
setTime();
setInterval(() => {
  setTime();
}, msToMin);
