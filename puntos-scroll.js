const sections = document.querySelectorAll("section");
const dots = document.querySelectorAll(".dot");

window.addEventListener("scroll", () => {

  let current = "";

  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;

    if (scrollY >= sectionTop - sectionHeight / 3) {
      current = section.getAttribute("id");
    }
  });

  dots.forEach(dot => {
    dot.classList.remove("active");

    if (dot.getAttribute("href") === "#" + current) {
      dot.classList.add("active");
    }
  });

});
