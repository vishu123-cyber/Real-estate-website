async function addProperty() {
  const property = {
    title: title.value,
    location: location.value,
    price: price.value
  };

  await fetch("/api/properties", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(property)
  });

  loadProperties();
}

async function loadProperties() {
  const res = await fetch("/api/properties");
  const data = await res.json();

  propertyList.innerHTML = "";
  data.forEach(p => {
    propertyList.innerHTML += `
      <div class="property">
        <h3>${p.title}</h3>
        <p>${p.location} - ₹${p.price}</p>
      </div>`;
  });
}

loadProperties();
