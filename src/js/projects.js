fetch("src/projects.json")
  .then((response) => response.json())
  .then((data) => {
    console.log(data);
    data.forEach((p) => {
      let name = p.name;
      let description = p.description;
      let image = p.image;
      let link = p.link;
      let icons = p.technologies;
      let technologies = [];

      p.technologies.forEach((i) => {
        let toPush;
        if (i === "nodejs") toPush = "NodeJS";
        else if (i === "js") toPush = "Javascript";
        else if (i === "py") toPush = "Python";
        else toPush = "???";
        technologies.push(toPush);
      });

      console.log(
        "Name:",
        name,
        "\nDescription:",
        description,
        "Image:",
        image,
        "\nLink:",
        link,
        "\nIcons:",
        icons.join(", "),
        "\nTechnologies:",
        technologies.join(", ")
      );

      createProject(name, description, image, link, [icons, technologies]);
    });
  })
  .catch((error) => console.error("Error loading JSON:", error));

function createProject(name, description, image, link, technologies) {
  let container = document.querySelector(".project-div");

  let project = document.createElement("a");
  project.href = link;
  project.target = "_blank";
  project.className = "project";
  project.rel = "noopener";

  let img = document.createElement("img");
  img.src = "src/img/projects/" + image;
  img.alt = "";

  let title = document.createElement("h2");
  title.textContent = name;

  let descriptionP = document.createElement("p");
  descriptionP.textContent = description;

  let technologiesDiv = document.createElement("div");
  technologiesDiv.className = "technologies";

  // Technologies
  console.log(technologies);
  let a;
  technologies[1].forEach((t, index) => {
    a = document.createElement("p");
    a.className = technologies[0][index];
    a.textContent = t;
    technologiesDiv.appendChild(a);
  });

  project.appendChild(img);
  project.appendChild(title);
  project.appendChild(descriptionP);
  project.appendChild(technologiesDiv);

  container.appendChild(project);
}

function viewMore() {
  let container = document.querySelector(".project-div");
  let hider = document.querySelector(".hider");
  let btn = document.querySelector(".view-more p");
  if (btn.getAttribute("type") === "more") {
    container.style.height = container.scrollHeight + "px";
    hider.style.opacity = "0";
    hider.style.height = "0";
    btn.setAttribute("type", "less");
    btn.textContent = "View less";
  } else {
    hider.setAttribute("style", "");
    container.setAttribute("style", "");
    btn.setAttribute("type", "more");
    btn.textContent = "View more";
  }
}
