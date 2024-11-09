
    document.addEventListener("DOMContentLoaded", function() {
        var allWords = {};
        var words = JSON.parse(document.getElementById('words-data').textContent);
        var descriptions = JSON.parse(document.getElementById('descriptions-data').textContent);
        var predefined_list = JSON.parse(document.getElementById('predefined-list').textContent);
        var mediaFiles = JSON.parse(document.getElementById('media-files').textContent);
        var points = localStorage.getItem("points") ? parseInt(localStorage.getItem("points")) : 0;
        var pointsBadge = document.getElementById("points-badge");
        
        // Custom high-contrast color scheme with 15 colors
        var fill = d3.scaleOrdinal([
            "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
            "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
            "#393b79", "#637939", "#8c6d31", "#843c39", "#5254a3"
        ]);

        var selectedWords = new Set();
        var pinnedWord = null;
        var isPinned = false; // Flag to track if a word is pinned

        max_freq = Math.max(...Object.values(words));
        min_freq = Math.min(...Object.values(words));
        scale_factor = 20 / Math.log(max_freq - min_freq + 1);
        allWords = Object.fromEntries(Object.entries(words).map(([word, freq]) => [word, 28 + scale_factor * Math.log((freq - min_freq) + 1)]));

        var showContextMenuMessage = sessionStorage.getItem("showContextMenuMessage") !== "false";

        function draw(words) {
            var svg = d3.select("#wordcloud-svg").selectAll("*").remove();
            var width = document.getElementById('wordcloud-container').clientWidth;
            var height = document.getElementById('wordcloud-container').clientHeight;
            svg = d3.select("#wordcloud-svg")
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

            var text = svg.selectAll("text")
                .data(words)
                .enter().append("text")
                .attr("class", function(d) { return selectedWords.has(d.text) ? "word selected" : "word"; })
                .style("font-size", function(d) { return d.size + "px"; })
                .style("fill", function(d, i) { return fill(i); })
                .attr("text-anchor", "middle")
                .attr("transform", function(d) {
                    return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                })
                .text(function(d) { return d.text; })
                .on("mouseover", function(event, d) {
                    if (!isPinned) {
                        showDescription(d.text);
                    }
                })
                .on("mouseout", function(event, d) {
                    if (!isPinned) {
                        clearDescription();
                    }
                })
                .on("click", function(event, d) {
                    if (selectedWords.has(d.text)) return;
                    d3.select(this).transition()
                        .duration(500)
                        .attr("transform", "translate(" + (width / 2 + Math.random() * 200 - 100) + "," + (height / 2 + Math.random() * 200 - 100) + ")rotate(0)")
                        .style("opacity", 0)
                        .remove();

                    selectedWords.add(d.text);

                    var wordDiv = document.createElement("div");
                    wordDiv.textContent = d.text;
                    wordDiv.style.color = fill(d.index);

                    var buttonContainer = document.createElement("div");
                    buttonContainer.style.display = "flex";
                    buttonContainer.style.gap = "5px";
                    buttonContainer.style.flexWrap = "wrap";

                    var searchButton = document.createElement("button");
                    searchButton.textContent = "Search";
                    searchButton.className = "search-button";
                    searchButton.style.flex = "1 1 auto";

                    
 searchButton.onclick = function() {
    var searchWords = d.text.toLowerCase().split(" ");
    var matches = predefined_list.filter(item => {
        var predefinedWords = item.word.toLowerCase().split(" ");
        return searchWords.some(searchWord => predefinedWords.includes(searchWord));
    });
    if (matches.length > 0) {
        var names = matches.map(match => `${match.name} (${match.word})`).join(", ");
        alert(`"${d.text}" Una parola è stata trovata nella word cloud dei vostri colleghi. Names: ${names}`);
    } else {
        alert(`"${d.text}" Nessuna parola è stata trovata nella word cloud dei vostri colleghi.`);
    }
};



                    
                    buttonContainer.appendChild(searchButton);

                    var emailButton = document.createElement("button");
                    emailButton.textContent = "Email";
                    emailButton.className = "email-button";
                    emailButton.style.flex = "1 1 auto";
                    emailButton.onclick = function() {
                        var subject = "Descrizione: " + d.text;
                        window.location.href = 'mailto:giuseppe.greco@pg.infn.it?subject=' + encodeURIComponent(subject);
                        points += 10;  // Aggiungi 10 punti per ogni email inviata
                        updatePointsBadge();
                        localStorage.setItem("points", points);  // Salva i punti in localStorage
                    };
                    buttonContainer.appendChild(emailButton);

                    var removeButton = document.createElement("button");
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

                    saveSelectedWords();
                    showDescription(d.text);  // Show description and media
                });

            var pinGroup = svg.selectAll("g.pin-group")
                .data(words)
                .enter().append("g")
                .attr("class", "pin-group")
                .attr("transform", function(d) {
                    return "translate(" + [d.x, d.y] + ")";
                });

            pinGroup.append("foreignObject")
                .attr("width", function(d) { return d.size + "px"; })
                .attr("height", function(d) { return d.size + "px"; })
                .attr("x", function(d) { return d.size / 2 + "px"; })
                .attr("y", function(d) { return -d.size / 2 + "px"; })
                .append("xhtml:div")
                .attr("class", "pushpin")
                .style("background-color", function(d, i) { return fill(i) + "b3"; })  // 70% transparency
                .on("click", function(event, d) {
                    d3.selectAll(".pushpin").classed("pinned", false).html(''); // Reset all pins
                    var currentPin = d3.select(this);
                    if (pinnedWord === d.text) {
                        pinnedWord = null;
                        isPinned = false;
                        clearDescription();
                        currentPin.classed("pinned", false);
                    } else {
                        pinnedWord = d.text;
                        isPinned = true;
                        showDescription(d.text);
                        currentPin.classed("pinned", true);
                        currentPin.html('📌'); // Add pin icon
                    }
                    d3.selectAll(".pushpin").classed("pinned", function(t) {
                        return t.text === pinnedWord;
                    });

                    if (showContextMenuMessage) {
                        var contextMenu = document.getElementById("context-menu");
                        contextMenu.innerHTML = `
                            <div class='context-menu-item'>
                                Click to pin or unpin a word. Pinned words' descriptions are always shown.
                                <button id="hide-context-menu" style="margin-top: 10px;">Don't show again</button>
                            </div>`;
                        contextMenu.style.display = "flex";
                        contextMenu.style.left = event.pageX + "px";
                        contextMenu.style.top = event.pageY + "px";
                        event.stopPropagation();

                        document.getElementById("hide-context-menu").onclick = function() {
                            showContextMenuMessage = false;
                            contextMenu.style.display = "none";
                        };
                    }
                });
        }

        function showDescription(word) {
            if (isPinned && pinnedWord !== word) {
                return;
            }
            var description = descriptions[word] || "No description available";
            var descriptionText = document.getElementById("description-text");
            descriptionText.innerHTML = description;

            var mediaContent = document.createElement("div");
            mediaContent.className = "media-content";

            var files = mediaFiles[word.toLowerCase().replace(/\s+/g, '_')] || [];
            if (files.length > 0) {
                files.forEach(function(file) {
                    var mediaElement;
                    if (file.endsWith(".mp4")) {
                        mediaElement = document.createElement("video");
                        mediaElement.width = 320;
                        mediaElement.height = 240;
                        mediaElement.controls = true;
                        var source = document.createElement("source");
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
                var noMediaMessage = document.createElement("p");
                noMediaMessage.textContent = "No media files found";
                mediaContent.appendChild(noMediaMessage);
            }

            descriptionText.appendChild(mediaContent);
        }

        function openModal(src) {
            var modal = document.getElementById("myModal");
            var modalImg = document.getElementById("modal-content");

            modal.style.display = "flex";
            if (src.endsWith(".mp4")) {
                modalImg.innerHTML = '<video width="100%" height="auto" controls><source src="' + src + '" type="video/mp4"></video>';
            } else {
                modalImg.innerHTML = '<img src="' + src + '" style="width:100%">';
            }

            var span = document.getElementsByClassName("close")[0];
            span.onclick = function() {
                modal.style.display = "none";
            };
        }

        function clearDescription() {
            if (isPinned) {
                return;
            }
            var descriptionText = document.getElementById("description-text");
            descriptionText.innerHTML = "";
        }

        function saveSelectedWords() {
            var selectedWordsArray = Array.from(selectedWords);
            localStorage.setItem("selectedWords", JSON.stringify(selectedWordsArray));
        }

        function loadSelectedWords() {
            var selectedWordsArray = JSON.parse(localStorage.getItem("selectedWords"));
            if (selectedWordsArray) {
                selectedWordsArray.forEach(function(word) {
                    selectedWords.add(word);
                    var wordDiv = document.createElement("div");
                    wordDiv.textContent = word;
                    wordDiv.style.color = fill(selectedWords.size);

                    var buttonContainer = document.createElement("div");
                    buttonContainer.style.display = "flex";
                    buttonContainer.style.gap = "5px";
                    buttonContainer.style.flexWrap = "wrap";

                    var searchButton = document.createElement("button");
                    searchButton.textContent = "Search";
                    searchButton.className = "search-button";
                    searchButton.style.flex = "1 1 auto";
                    searchButton.onclick = function() {
                        var matches = predefined_list.filter(item => item.word === word);
                        if (matches.length > 0) {
                            var names = matches.map(match => match.name).join(", ");
                            alert(word + " found in predefined list. Names: " + names);
                        } else {
                            alert(word + " not found in predefined list.");
                        }
                    };
                    buttonContainer.appendChild(searchButton);

                    var emailButton = document.createElement("button");
                    emailButton.textContent = "Email";
                    emailButton.className = "email-button";
                    emailButton.style.flex = "1 1 auto";
                    emailButton.onclick = function() {
                        var subject = "Descrizione: " + word;
                        window.location.href = 'mailto:gius?subject=' + encodeURIComponent(subject);
                        points += 10;  // Aggiungi 10 punti per ogni email inviata
                        updatePointsBadge();
                        localStorage.setItem("points", points);  // Salva i punti in localStorage
                    };
                    buttonContainer.appendChild(emailButton);

                    var removeButton = document.createElement("button");
                    removeButton.textContent = "Remove";
                    removeButton.className = "remove-button";
                    removeButton.style.flex = "1 1 auto";
                    removeButton.onclick = function() {
                        wordDiv.remove();
                        selectedWords.delete(word);
                        generateWordCloud();
                    };
                    buttonContainer.appendChild(removeButton);

                    wordDiv.appendChild(buttonContainer);
                    document.getElementById("selected-words-container").appendChild(wordDiv);
                });
            }
        }

        function updatePointsBadge() {
            pointsBadge.textContent = points;
        }

        function generateWordCloud(sizeMultiplier = 1) {
            var width = document.getElementById('wordcloud-container').clientWidth;
            var height = 600;
            d3.layout.cloud()
                .size([width, height])
                .words(Object.keys(allWords).filter(word => !selectedWords.has(word)).map(function(d) {
                    return {'text': d, 'size': allWords[d] * sizeMultiplier};
                }))
                .padding(10)
                .rotate(function(d) { return (d.size > 50 ? 0 : ~~(Math.random() * 2) * 90); })
                .font("Impact")
                .fontSize(function(d) { return d.size; })
                .on("end", function(words, bounds) {
                    var width = bounds[1].x - bounds[0].x + 20;
                    var height = bounds[1].y - bounds[0].y + 20;
                    d3.select("#wordcloud-svg")
                        .attr("width", width)
                        .attr("height", height)
                        .append("g")
                        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
                    draw(words);
                    generateFrequencyChart();
                })
                .start();
        }

        function generateFrequencyChart() {
            var chartData = Object.keys(allWords).map(function(d) {
                return {'word': d, 'frequency': allWords[d]};
            });
            chartData.sort(function(a, b) {
                return b.frequency - a.frequency;
            });
            
            var svg = d3.select("#frequency-chart").html("").append("svg")
                .attr("width", 600)
                .attr("height", 400)
                .append("g")
                .attr("transform", "translate(50, 20)");

            var x = d3.scaleBand()
                .range([0, 500])
                .padding(0.1)
                .domain(chartData.map(function(d) { return d.word; }));
            var y = d3.scaleLinear()
                .range([300, 0])
                .domain([0, d3.max(chartData, function(d) { return d.frequency; })]);

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
                .attr("id", function(d) { return "bar-" + d.word.replace(/\s+/g, '-'); })
                .attr("x", function(d) { return x(d.word); })
                .attr("width", x.bandwidth())
                .attr("y", function(d) { return y(d.frequency); })
                .attr("height", function(d) { return 300 - y(d.frequency); })
                .style("fill", function(d, i) { return fill(i); })
                .on("click", function(event, d) {
                    var barElement = d3.select(this);
                    var isHighlighted = barElement.classed("highlight-bar");
                    d3.selectAll("#wordcloud-svg .word").classed("highlight", false).transition().style("font-size", function(d) { return d.size + "px"; }).style("fill", function(d, i) { return fill(i); });
                    d3.selectAll(".bar").classed("highlight-bar", false);
                    if (!isHighlighted) {
                        barElement.classed("highlight-bar", true);
                        d3.selectAll("#wordcloud-svg .word").filter(function(word) { return word.text === d.word; }).classed("highlight", true).transition().style("font-size", function(word) { return word.size * 1.5 + "px"; }).style("fill", "red");
                    }
                });
        }

        document.getElementById("reset-button").onclick = function() {
            document.getElementById("selected-words-container").innerHTML = "<h3>Selected Words</h3>";
            words = {...allWords};
            selectedWords.clear();
            generateWordCloud();
            localStorage.removeItem("selectedWords");
        };

        document.getElementById("save-button").onclick = function() {
            html2canvas(document.querySelector("#wordcloud-container")).then(canvas => {
                var link = document.createElement('a');
                link.download = 'wordcloud.jpg';
                link.href = canvas.toDataURL('image/jpeg');
                link.click();
            });
        };

        document.getElementById("search-input").oninput = function() {
            var searchValue = this.value.toLowerCase();
            var filteredWords = Object.keys(words)
                .filter(word => word.toLowerCase().includes(searchValue))
                .map(word => { return {'text': word, 'size': allWords[word]}; }); // Keep the original size
            d3.layout.cloud()
                .size([600, 400])
                .words(filteredWords)
                .padding(10)
                .rotate(function() { return 0; })
                .font("Impact")
                .fontSize(function(d) { return d.size; }) // Keep the original size
                .on("end", draw)
                .start();
        };

        document.getElementById("word-size-slider").oninput = function() {
            var sizeMultiplier = this.value / 50; // Normalize around 1
            generateWordCloud(sizeMultiplier);
        };

        generateWordCloud();
        loadSelectedWords();
        updatePointsBadge();

        // Hide context menu when clicking anywhere else
        document.addEventListener("click", function() {
            var contextMenu = document.getElementById("context-menu");
            contextMenu.style.display = "none";
        });
    });
    