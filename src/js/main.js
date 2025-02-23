function copy(text, type) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      let q = document.querySelector(".contact-info[img='" + type + "'] p");
      q.classList.add("show-copy-positive");
      setTimeout(() => {
        q.classList.remove("show-copy-positive");
      }, 600);
    })
    .catch((err) => {
      let q = document.querySelector(".contact-info[img='" + type + "'] p");
      q.classList.add("show-copy-negative");
      setTimeout(() => {
        console.log(q);
        q.classList.remove("show-copy-negative");
      }, 600);
    });
}
