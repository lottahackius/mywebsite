const continentBaseColors = {
  America: "#E4572E",
  Europe: "#29335C",
  Africa: "#F3A712",
  Asia: "#A8C686"
};

let stageHeight;
let stageWidth;
let renderer;
const continentGroups = {};
const continentTotals = [];
let regionHeight;

init();

function resizeRenderer(height) {
  renderer.style.height = `${height}px`;
}

function init() {
  renderer = document.querySelector("#renderer");
  // Entferne paddingTop und top, damit die Grafik oben bündig startet
  renderer.style.paddingTop = "0px";
  renderer.style.top = "0px";
  stageWidth = renderer.clientWidth;
  stageHeight = renderer.clientHeight;

  regionHeight = stageHeight / 16;
  prepareData();
  drawDiagram();
}

function prepareData() {
  const groupedData = gmynd.groupData(migrantData, [
    "Region of Incident",
    "Incident year",
    "Reported Month"
  ]);

  const monthMap = {
    January: 0,
    February: 1,
    March: 2,
    April: 3,
    May: 4,
    June: 5,
    July: 6,
    August: 7,
    September: 8,
    October: 9,
    November: 10,
    December: 11
  };

  const continentRegions = {
    America: ["North America", "Central America", "South America", "Caribbean"],
    Europe: ["Europe", "Mediterranean"],
    Africa: [
      "Northern Africa",
      "Eastern Africa",
      "Southern Africa",
      "Western Africa",
      "Middle Africa"
    ],
    Asia: [
      "Western Asia",
      "Central Asia",
      "Southern Asia",
      "Eastern Asia",
      "South-Eastern Asia"
    ] // Großes E
  };

  // Hilfsfunktion für tolerant Matching
  function findRegionKeyInsensitive(obj, regionName) {
    const keys = Object.keys(obj);
    const found = keys.find(k => k.toLowerCase() === regionName.toLowerCase());
    return found || regionName;
  }

  for (const continent in continentRegions) {
    const regionList = [];
    let continentTotal = 0;

    for (const region of continentRegions[continent]) {
      // Nutze tolerant Matching für Regionsnamen
      const regionKey = findRegionKeyInsensitive(groupedData, region);
      if (!groupedData[regionKey]) continue;

      const yearsObj = groupedData[regionKey];
      const transformedYears = {};
      let regionTotal = 0;

      for (const year in yearsObj) {
        const monthsObj = yearsObj[year];
        const monthsArray = Array(12)
          .fill(null)
          .map(() => ({
            incidents: [],
            totalDeadAndMissing: 0
          }));

        for (const monthName in monthsObj) {
          const monthIndex = monthMap[monthName];
          const incidents = monthsObj[monthName] || [];

          monthsArray[monthIndex].incidents = incidents;
          monthsArray[monthIndex].totalDeadAndMissing = incidents.reduce(
            (sum, entry) => sum + (entry["Total Number of Dead and Missing"] || 0),
            0
          );

          regionTotal += monthsArray[monthIndex].totalDeadAndMissing;
        }

        transformedYears[year] = monthsArray;
      }

      regionList.push({ region, data: transformedYears, total: regionTotal });
    }

    regionList.sort((a, b) => b.total - a.total);
    continentGroups[continent] = regionList.map(entry => ({ [entry.region]: entry.data }));

    continentTotal = regionList.reduce((sum, entry) => sum + entry.total, 0);
    continentTotals.push({ continent, total: continentTotal, regions: continentGroups[continent] });
  }

  // Sortiere Kontinente nach neuer gewünschter Reihenfolge
  const continentOrder = ['America', 'Europe', 'Africa', 'Asia'];
  continentTotals.sort((a, b) => continentOrder.indexOf(a.continent) - continentOrder.indexOf(b.continent));
}

function drawDiagram() {
  // Berechne dynamisch die vertikalen und horizontalen Offsets und Größen, damit alles ins Canvas passt
  const paddingTop = 40; // Platz für Labels oben
  const paddingLeft = 200; // Mehr Platz für Labels links
  const paddingBottom = 60; // Platz für Achsenbeschriftung unten
  const paddingRight = 150;

  // Dynamische Höhe pro Region, damit alles ins Canvas passt
  let totalRegionCount = 0;
  continentTotals.forEach(c => totalRegionCount += c.regions.length);
  // Anzahl der Kontinente
  const continentCount = continentTotals.length;
  // Definiere den gewünschten Abstand zwischen Kontinenten
  const extraContinentSpacing = 60;
  // Ziehe die Gesamthöhe der Abstände von der verfügbaren Höhe ab
  const availableHeight = stageHeight - paddingTop - paddingBottom - (extraContinentSpacing * (continentCount - 1));
  regionHeight = availableHeight / totalRegionCount;

  // Dynamische Breite pro Monat, damit alles ins Canvas passt
  const allYears = new Set();
  continentTotals.forEach(c => {
    c.regions.forEach(r => {
      const years = Object.values(r)[0];
      Object.keys(years).forEach(y => allYears.add(parseInt(y)));
    });
  });
  const sortedYears = Array.from(allYears).sort((a, b) => a - b);
  const startYear = sortedYears[0];
  const endYear = sortedYears[sortedYears.length - 1];
  const totalMonths = (endYear - startYear + 1) * 12;
  const availableWidth = stageWidth - paddingLeft - paddingRight;
  const yearSpacing = 8; // Abstand zwischen Jahren (klein halten!)
  const monthWidth = (availableWidth - ((endYear - startYear) * yearSpacing)) / totalMonths;
  const barWidth = Math.max(monthWidth * 0.7, 2.0); // evtl. minimal schmaler
  const xOffset = paddingLeft + 150;

  renderer.innerHTML = "";

  let maxDeaths = 0;

  console.log(continentTotals)
  continentTotals.forEach(continent => {
    continent.regions.forEach(region => {
      const years = Object.values(region)[0];
      Object.values(years).forEach(months => {
        months.forEach(m => {
          if (m.totalDeadAndMissing > maxDeaths) {
            maxDeaths = m.totalDeadAndMissing;
          }
        });
      });
    });
  });

  let yPosContinent = paddingTop;
  continentTotals.forEach((continentData, continentIdx) => {
    const continentColor = continentBaseColors[continentData.continent] || "#ccc";
    let yPosRegion = 0;

    const continentLabel = document.createElement('div');
    continentLabel.className = 'label';
    continentLabel.innerText = continentData.continent;
    continentLabel.style.position = 'absolute';
    const continentStartY = yPosContinent;
    const continentEndY = yPosContinent + continentData.regions.length * regionHeight;
    const continentMiddleY = (continentStartY + continentEndY) / 2;
    continentLabel.style.left = '80px';
    continentLabel.style.top = `${continentMiddleY}px`;
    continentLabel.style.fontSize = '20px'; // Deutlich größere Kontinentschrift
    continentLabel.style.color = '#fff'; // Kontinentschrift immer weiß
    continentLabel.style.transform = 'rotate(-90deg) translateX(-45%) translateY(-30%)';
    continentLabel.style.transformOrigin = 'left top';
    renderer.appendChild(continentLabel);

    continentData.regions.forEach((regionData, regionIndex) => {
      const [region, years] = Object.entries(regionData)[0];
      yPosRegion = yPosContinent + (regionIndex * regionHeight);
      const yDot = yPosRegion + regionHeight / 2;

      const regionLabel = document.createElement('div');
      regionLabel.className = 'label region-label-dynamic';
      regionLabel.innerText = region;
      regionLabel.style.position = 'absolute';
      regionLabel.style.left = '220px';
      regionLabel.style.top = `${yPosRegion + regionHeight / 2 - 8}px`;
      regionLabel.style.fontSize = '14px'; // Deutlich größere Regionsschrift
      regionLabel.style.color = '#ccc';
      renderer.appendChild(regionLabel);

      // Grundfarbe für diese Region = Kontinentfarbe
      const baseColor = continentColor;

      // Ermittle das Maximum für diese Region (über alle Monate/Jahre)
      let regionMax = 0;
      Object.values(years).forEach(months => {
        months.forEach(m => {
          if (m.totalDeadAndMissing > regionMax) regionMax = m.totalDeadAndMissing;
        });
      });

      let yearIndex = 0;

      Object.entries(years).forEach(([year, months]) => {
        months.forEach((monthData, monthIndex) => {
          if (monthData.totalDeadAndMissing > 0) {
            const yearOffset = parseInt(year) - startYear;
            const yearSpacing = availableWidth / totalMonths * 12 * 0.9; // z.B. 20% eines Jahres
            const xPos = xOffset + (yearOffset + monthIndex) * monthWidth + yearOffset * yearSpacing;

            // Logarithmische Skalierung für die Balkenhöhe, max. 120% der Regionhöhe
            const minValue = 1;
            const logMin = Math.log(minValue);
            const logMax = Math.log(maxDeaths + 1);
            const logValue = Math.log(monthData.totalDeadAndMissing + 1);
            const maxBarHeight = regionHeight * 1.2;
            const scaledHeight = Math.max(((logValue - logMin) / (logMax - logMin)) * maxBarHeight, 4);

            // Farbverlauf: Sättigung/Alpha je nach Anteil am Maximum der Region
            let intensity = monthData.totalDeadAndMissing / regionMax;
            intensity = Math.max(0.15, Math.min(1, intensity));
            // Nutze HSL, falls möglich, sonst Alpha
            let barColor = baseColor;
            function hexToHSL(hex) {
              let r = 0, g = 0, b = 0;
              if (hex.length === 7) {
                r = parseInt(hex.slice(1, 3), 16) / 255;
                g = parseInt(hex.slice(3, 5), 16) / 255;
                b = parseInt(hex.slice(5, 7), 16) / 255;
              }
              const max = Math.max(r, g, b), min = Math.min(r, g, b);
              let h, s, l = (max + min) / 2;
              if (max === min) {
                h = s = 0;
              } else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                  case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                  case g: h = (b - r) / d + 2; break;
                  case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
              }
              return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
            }
            if (baseColor.startsWith('#')) {
              const [h, s, l] = hexToHSL(baseColor);
              barColor = `hsl(${h}, ${s}%, ${Math.round(30 + 60 * intensity)}%)`;
            } else {
              barColor = baseColor.replace('rgb', 'rgba').replace(')', `,${intensity})`);
            }

            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.position = 'absolute';
            bar.dataset.month = monthIndex;
            bar.style.left = `${xPos}px`;
            bar.style.top = `${yDot - scaledHeight / 2}px`;
            bar.style.width = `${barWidth}px`;
            bar.style.height = `${scaledHeight}px`;
            bar.style.backgroundColor = barColor;
            bar.style.borderRadius = `${Math.min(barWidth / 0.5)}px`;
            bar.title = `${continentData.continent} - ${region}, ${getMonthName(monthIndex)} ${year}\n${monthData.totalDeadAndMissing} dead/missing`;

            // Interaktivität: Bei Klick auf Balken aus Amerika, andere Kontinente, Regionen und Balken nach unten verschieben und ausblenden
            if (continentData.continent === "America") {
              bar.style.cursor = "pointer";
              bar.onclick = () => {
                // Alle Balken, Labels und Kontinente der anderen Kontinente verschieben und ausblenden
                const allBars = document.querySelectorAll('.bar');
                const allLabels = document.querySelectorAll('.label');
                // Die Zeitachsen-Beschriftung bleibt sichtbar!
                continentTotals.forEach(otherContinent => {
                  if (otherContinent.continent !== "America") {
                    // Kontinent-Label
                    allLabels.forEach(l => {
                      if (l.innerText === otherContinent.continent) {
                        l.style.transition = 'transform 0.7s, opacity 0.7s';
                        l.style.transform = 'translateY(800px)';
                        l.style.opacity = '0';
                      }
                    });
                    // Regionen-Labels
                    otherContinent.regions.forEach(regionObj => {
                      const regionName = Object.keys(regionObj)[0];
                      allLabels.forEach(l => {
                        if (l.innerText === regionName) {
                          l.style.transition = 'transform 0.7s, opacity 0.7s';
                          l.style.transform = 'translateY(800px)';
                          l.style.opacity = '0';
                        }
                      });
                    });
                    // Balken
                    allBars.forEach(b => {
                      if (b.title && b.title.startsWith(otherContinent.continent)) {
                        b.style.transition = 'transform 0.7s, opacity 0.7s';
                        b.style.transform = 'translateY(800px)';
                        b.style.opacity = '0';
                      }
                    });
                  }
                });
                // Die Zeitachsen-Beschriftung bleibt unverändert!

                // Nach kurzer Zeit: Abstand zwischen Amerika-Regionen vergrößern (inkl. Balken)
                setTimeout(() => {
                  // Hole alle Amerika-Regionen in der Reihenfolge
                  const americaRegions = continentGroups['America'].map(r => Object.keys(r)[0]);
                  // Definiere neuen Abstand
                  const newSpacing = 200;
                  const startY = 70;
                  const startX = 220;
                  // Positioniere die Labels der Regionen neu
                  americaRegions.forEach((regionName, idx) => {
                    // Regionen-Labels verschieben
                    allLabels.forEach(l => {
                      if (l.innerText === regionName) {
                        l.style.transition = 'top 0.7s';
                        l.style.top = `${startY + idx * newSpacing}px`;
                      }
                    });
                    // Balken der Region verschieben
                    allBars.forEach(b => {
                      if (
                        b.title &&
                        b.title.startsWith('America') &&
                        b.title.includes(regionName)
                      ) {
                        b.style.transition = 'top 0.7s';
                        // Extrahiere aktuelle Höhe des Balkens
                        const barHeight = parseFloat(b.style.height);
                        // Zentriere Balken auf neue Y-Position der Region
                        b.style.top = `${startY + idx * newSpacing + regionHeight / 2 - barHeight / 2}px`;
                      }
                    });
                  });
                }, 800); // nach 0.8 Sekunden
              };
            }

            renderer.appendChild(bar);
          }
        });
        yearIndex++;
      });
    });
    yPosContinent += continentData.regions.length * regionHeight + extraContinentSpacing;
  });

  // Die Zeitachse soll direkt nach dem letzten Kontinent erscheinen, ohne extra Abstand
  const axisY = yPosContinent - extraContinentSpacing + 40;
  const axisXOffset = 10; // Hier kannst du die Zeitachse nach links/rechts verschieben
  for (let year = startYear; year <= endYear; year++) {
    const xPos = xOffset + (year - startYear) * 12 * monthWidth + axisXOffset;
    const tick = document.createElement('div');
    tick.className = 'year-label';
    tick.innerText = year;
    tick.style.position = 'absolute';
    tick.style.left = `${xPos}px`;
    tick.style.top = `${axisY}px`;
    tick.style.fontSize = '12px';
    tick.style.color = '#aaa';
    tick.style.textAlign = 'center';
    tick.style.minWidth = '30px';
    renderer.appendChild(tick);
  }
}

function getMonthName(monthNumber) {
  const monthMap = {
    0: "January",
    1: "February",
    2: "March",
    3: "April",
    4: "May",
    5: "June",
    6: "July",
    7: "August",
    8: "September",
    9: "October",
    10: "November",
    11: "December"
  };
  return monthMap[monthNumber] || "Invalid month";
}