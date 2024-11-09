document.addEventListener("DOMContentLoaded", function() {
    let allWords = {};
    const words = JSON.parse(document.getElementById('words-data').textContent);
    const descriptions = JSON.parse(document.getElementById('descriptions-data').textContent);
    const predefined_list = JSON.parse(document.getElementById('predefined-list').textContent);
    const mediaFiles = JSON.parse(document.getElementById('media-files').textContent);
    let points = localStorage.getItem("points") ? parseInt(localStorage.getItem("points")) : 0;
    const pointsBadge = document.getElementById("points-badge");

    // Custom high-contrast color scheme with 15 colors
    const fill = d3.scaleOrdinal([
        "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
        "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
        "#393b79", "#637939", "#8c6d31", "#843c39", "#5254a3"
    ]);

    const selectedWords = new Set();
    let pinnedWord = null;
    let isPinned = false;

    const max_freq = Math.max(...Object.values(words));
    const min_freq = Math.min(...Object.values(words));
    const scale_factor = 20 / Math.log(max_freq - min_freq + 1);
    allWords = Object.fromEntries(Object.entries(words).map(([word, freq]) => [
        word, 28 + scale_factor * Math.log((freq - min_freq) + 1)
    ]));

    let showContextMenuMessage = sessionStorage.getItem("showContextMenuMessage") !== "false";

    function draw(words) {
        let svg = d3.select("#wordcloud-svg").selectAll("*").remove();
        const width = document.getElementById('wordcloud-container').clientWidth;
        const height = document.getElementById('wordcloud-container').clientHeight;

        svg = d3.select("#wordcloud-svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);

        svg.selectAll("text")
            .data(words)
            .enter().append("text")
            .attr("class", d => selectedWords.has(d.text) ? "word selected" : "word")
            .style("font-size", d => `${d.size}px`)
            .style("fill", (d, i) => fill(i))
            .attr("text-anchor", "middle")
            .attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
            .text(d => d.text)
            .on("mouseover", function(event, d) {
                if (!isPinned) showDescription(d.text);
            })
            .on("mouseout", function() {
                if (!isPinned) clearDescription();
            })
            .on("click", function(event, d) {
                if (!selectedWords.has(d.text)) {
                    d3.select(this).transition()
                        .duration(500)
                        .attr("transform", `translate(${width / 2 + Math.random() * 200 - 100},${height / 2 + Math.random() * 200 - 100})rotate(0)`)
                        .style("opacity", 0)
                        .remove();
                    
                    selectedWords.add(d.text);
                    createWordElement(d);
                    saveSelectedWords();
                    showDescription(d.text);
                }
            });
    }

    function createWordElement(d) {
        const wordDiv = document.createElement("div");
        wordDiv.textContent = d.text;
        wordDiv.style.color = fill(d.index);
        
        const buttonContainer = document.createElement("div");
        buttonContainer.style.display = "flex";
        buttonContainer.style.gap = "5px";
        buttonContainer.style.flexWrap = "wrap";

        const searchButton = document.createElement("button");
        searchButton.textContent = "Search";
        searchButton.className = "search-button";
        searchButton.style.flex = "1 1 auto";
        searchButton.onclick = function() {
            const searchWords = d.text.toLowerCase().split(" ");
            const matches = predefined_list.filter(item => {
                const predefinedWords = item.word.toLowerCase().split(" ");
                return searchWords.some(searchWord => predefinedWords.includes(searchWord));
            });
            if (matches.length > 0) {
                const names = matches.map(match => `${match.name} (${match.word})`).join(", ");
                alert(`"${d.text}" found in colleague word cloud. Names: ${names}`);
            } else {
                alert(`"${d.text}" not found in colleague word cloud.`);
            }
        };
        buttonContainer.appendChild(searchButton);

        const emailButton = document.createElement("button");
        emailButton.textContent = "Email";
        emailButton.className = "email-button";
        emailButton.style.flex = "1 1 auto";
        emailButton.onclick = function() {
            const subject = `Description: ${d.text}`;
            window.location.href = `mailto:giuseppe.greco@pg.infn.it?subject=${encodeURIComponent(subject)}`;
            points += 10;
            updatePointsBadge();
            localStorage.setItem("points", points);
        };
        buttonContainer.appendChild(emailButton);

        const removeButton = document.createElement("button");
        removeButton.textContent = "Remove";
        removeButton.className = "remove-button";
        removeButton.style.flex = "1 1 auto";
        removeButton.onclick = function() {
            wordDiv.remove();
            selectedWords.delete(d.text);
            generateWordCloud();
        };
        buttonContainer.appendChild(removeButton);

        wordDiv.appendChild(buttonContainer);
        document.getElementById("selected-words-container").appendChild(wordDiv);
    }

    function showDescription(word) {
        if (isPinned && pinnedWord !== word) return;

        const description = descriptions[word] || "No description available";
        const descriptionText = document.getElementById("description-text");
        descriptionText.innerHTML = description;

        const mediaContent = document.createElement("div");
        mediaContent.className = "media-content";

        const files = mediaFiles[word.toLowerCase().replace(/\s+/g, '_')] || [];
        if (files.length > 0) {
            files.forEach(file => {
                let mediaElement;
                if (file.endsWith(".mp4")) {
                    mediaElement = document.createElement("video");
                    mediaElement.width = 320;
                    mediaElement.height = 240;
                    mediaElement.controls = true;
                    const source = document.createElement("source");
                    source.src = file;
                    source.type = "video/mp4";
                    mediaElement.appendChild(source);
                } else if (file.endsWith(".jpg") || file.endsWith(".png")) {
                    mediaElement = document.createElement("img");
                    mediaElement.src = file;
                    mediaElement.width = 320;
                    mediaElement.height = 240;
                    mediaElement.onclick = function() {
                        openModal(file);
                    };
                }
                mediaContent.appendChild(mediaElement);
            });
        } else {
            const noMediaMessage = document.createElement("p");
            noMediaMessage.textContent = "No media files found";
            mediaContent.appendChild(noMediaMessage);
        }

        descriptionText.appendChild(mediaContent);
    }

    function openModal(src) {
        const modal = document.getElementById("myModal");
        const modalImg = document.getElementById("modal-content");

        modal.style.display = "flex";
        if (src.endsWith(".mp4")) {
            modalImg.innerHTML = `<video width="100%" height="auto" controls><source src="${src}" type="video/mp4"></video>`;
        } else {
            modalImg.innerHTML = `<img src="${src}" style="width:100%">`;
        }

        const span = document.getElementsByClassName("close")[0];
        span.onclick = function() {
            modal.style.display = "none";
        };
    }

    function clearDescription() {
        if (isPinned) return;
        document.getElementById("description-text").innerHTML = "";
    }

    function saveSelectedWords() {
        localStorage.setItem("selectedWords", JSON.stringify(Array.from(selectedWords)));
    }

    function loadSelectedWords() {
        const selectedWordsArray = JSON.parse(localStorage.getItem("selectedWords"));
        if (selectedWordsArray) {
            selectedWordsArray.forEach(word => {
                selectedWords.add(word);
                createWordElement({ text: word });
            });
        }
    }

    function updatePointsBadge() {
        pointsBadge.textContent = points;
    }

    function generateWordCloud(sizeMultiplier = 1) {
        const width = document.getElementById('wordcloud-container').clientWidth;
        const height = 600;

        d3.layout.cloud()
            .size([width, height])
            .words(Object.keys(allWords).filter(word => !selectedWords.has(word)).map(d => ({ text: d, size: allWords[d] * sizeMultiplier })))
            .padding(10)
            .rotate(d => (d.size > 50 ? 0 : ~~(Math.random() * 2) * 90))
            .font("Impact")
            .fontSize(d => d.size)
            .on("end", draw)
            .start();
    }

    function generateFrequencyChart() {
        const chartData = Object.keys(allWords).map(d => ({ word: d, frequency: allWords[d] }));
        chartData.sort((a, b) => b.frequency - a.frequency);
        
        const svg = d3.select("#frequency-chart").html("").append("svg")
            .attr("width", 600)
            .attr("height", 400)
            .append("g")
            .attr("transform", "translate(50, 20)");

        const x = d3.scaleBand().range([0, 500]).padding(0.1).domain(chartData.map(d => d.word));
        const y = d3.scaleLinear().range([300, 0]).domain([0, d3.max(chartData, d => d.frequency)]);

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0,300)")
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "rotate(45)")
            .style("text-anchor", "start");

        svg.selectAll(".bar")
            .data(chartData)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("id", d => `bar-${d.word.replace(/\s+/g, '-')}`)
            .attr("x", d => x(d.word))
            .attr("width", x.bandwidth())
            .attr("y", d => y(d.frequency))
            .attr("height", d => 300 - y(d.frequency))
            .style("fill", (d, i) => fill(i))
            .on("click", function(event, d) {
                const barElement = d3.select(this);
                const isHighlighted = barElement.classed("highlight-bar");
                d3.selectAll("#wordcloud-svg .word").classed("highlight", false).transition().style("font-size", d => `${d.size}px`).style("fill", (d, i) => fill(i));
                d3.selectAll(".bar").classed("highlight-bar", false);
                if (!isHighlighted) {
                    barElement.classed("highlight-bar", true);
                    d3.selectAll("#wordcloud-svg .word").filter(word => word.text === d.word).classed("highlight", true).transition().style("font-size", d => `${d.size * 1.5}px`).style("fill", "red");
                }
            });
    }

    document.getElementById("reset-button").onclick = function() {
        document.getElementById("selected-words-container").innerHTML = "<h3>Selected Words</h3>";
        selectedWords.clear();
        generateWordCloud();
        localStorage.removeItem("selectedWords");
    };

    document.getElementById("save-button").onclick = function() {
        html2canvas(document.querySelector("#wordcloud-container")).then(canvas => {
            const link = document.createElement('a');
            link.download = 'wordcloud.jpg';
            link.href = canvas.toDataURL('image/jpeg');
            link.click();
        });
    };

    document.getElementById("search-input").oninput = function() {
        const searchValue = this.value.toLowerCase();
        const filteredWords = Object.keys(words)
            .filter(word => word.toLowerCase().includes(searchValue))
            .map(word => ({ text: word, size: allWords[word] }));
        
        d3.layout.cloud()
            .size([600, 400])
            .words(filteredWords)
            .padding(10)
            .rotate(0)
            .font("Impact")
            .fontSize(d => d.size)
            .on("end", draw)
            .start();
    };

    document.getElementById("word-size-slider").oninput = function() {
        const sizeMultiplier = this.value / 50;
        generateWordCloud(sizeMultiplier);
    };

    generateWordCloud();
    loadSelectedWords();
    updatePointsBadge();

    document.addEventListener("click", function() {
        document.getElementById("context-menu").style.display = "none";
    });
});
