document.addEventListener('DOMContentLoaded', function() {
    const coursesList = document.getElementById('coursesList');

    let selectedCourses = [];
    let allCourses = [];
    let applied = false;

    chrome.storage.local.get(['visibleCourses', 'applied'], (result) => {
        try {
            selectedCourses = JSON.parse(result.visibleCourses || '[]');
        } catch (error) {
            selectedCourses = [];
        }
        applied = result.applied === true;
        loadCourses();
    });

    function loadCourses() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                function: getCoursesFromPage
            }, (results) => {
                if (results?.[0]?.result) {
                    allCourses = results[0].result;
                    // select all by default
                    if (selectedCourses.length === 0 && !applied) {
                        selectedCourses = allCourses.map(c => c.href);
                    }
                    renderCourses();
                } else {
                    coursesList.innerHTML = `
                        <div>
                            <p>No courses found. Please refresh the page and try again.</p>
                        </div>
                    `;
                }
            });
        });
    }

    function getCoursesFromPage() {
        const courses = [];
        const myCoursesToggle = document.querySelector('a.dropdown-toggle[title="My courses"]');
        if (myCoursesToggle) {
            const dropdownMenu = myCoursesToggle.parentElement.querySelector('.dropdown-menu');
            if (dropdownMenu) {
                const courseLinks = dropdownMenu.querySelectorAll('a[href*="course/view.php"]');
                courseLinks.forEach(item => {
                    const title = item.title || item.textContent.trim();
                    const href = item.href;
                    courses.push({ title, href });
                });
            }
        }
        return courses;
    }

    function saveState(callback) {
        chrome.storage.local.set({
            'applied': applied,
            'visibleCourses': JSON.stringify(selectedCourses)
        }, callback);
    }

    function showButtonFeedback(button, text, color, duration = 2000) {
        const originalText = button.textContent;
        const originalColor = button.style.background;
        button.textContent = text;
        button.style.background = color;
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = originalColor;
        }, duration);
    }

    function toggleCourse(href, isSelected) {
        if (isSelected) {
            if (!selectedCourses.includes(href)) {
                selectedCourses.push(href);
            }
        } else {
            selectedCourses = selectedCourses.filter(id => id !== href);
        }
    }

    function renderCourses() {
        const selectedCount = selectedCourses.length;
        const totalCount = allCourses.length;
        
        let html = `
            <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">
                    ${applied ? `Showing ${selectedCount} of ${totalCount} courses` : `Select courses to show (${selectedCount} selected)`}
                </p>
                <div style="display: flex; gap: 8px; font-size: 12px;">
                    <a href="#" id="selectAll" style="color: #007bff; text-decoration: none;">Select All</a>
                    <span style="color: #ccc;">|</span>
                    <a href="#" id="deselectAll" style="color: #007bff; text-decoration: none;">Deselect All</a>
                </div>
            </div>
        `;
        
        allCourses.forEach(course => {
            html += `
                <div class="course-item">
                    <input type="checkbox" 
                           class="course-checkbox" 
                           id="course-${course.href}" 
                           data-href="${course.href}">
                    <label class="course-label" for="course-${course.href}">
                        ${course.title}
                    </label>
                </div>
            `;
        });
        
        html += `
            <div style="margin-top: 20px; text-align: center;">
                <button id="applyBtn" class="btn btn-primary" style="padding: 10px 20px; font-size: 14px;">Apply Selection</button>
                <button id="resetBtn" class="btn btn-secondary" style="padding: 10px 20px; font-size: 14px; margin-left: 10px;">Show All</button>
            </div>
        `;
        
        coursesList.innerHTML = html;

        coursesList.querySelectorAll('input[type=checkbox]').forEach(checkbox => {
            checkbox.checked = selectedCourses.includes(checkbox.dataset.href);
            checkbox.addEventListener('change', function() {
                toggleCourse(this.dataset.href, this.checked);
            });
        });

        document.getElementById('selectAll')?.addEventListener('click', function(e) {
            e.preventDefault();
            selectedCourses = allCourses.map(c => c.href);
            renderCourses();
        });

        document.getElementById('deselectAll')?.addEventListener('click', function(e) {
            e.preventDefault();
            selectedCourses = [];
            renderCourses();
        });

        document.getElementById('applyBtn')?.addEventListener('click', function() {
            if (selectedCourses.length === 0) {
                alert('Please select at least one course to show.');
                return;
            }
            applied = true;
            saveState(() => {
                renderCourses();
                applyCourseFilter();
                showButtonFeedback(this, 'Applied!', '#28a745');
            });
        });

        document.getElementById('resetBtn')?.addEventListener('click', function() {
            applied = false;
            selectedCourses = allCourses.map(c => c.href);
            saveState(() => {
                renderCourses();
                applyCourseFilter();
            });
        });
    }

    function applyCourseFilter() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                function: filterCoursesOnPage,
                args: [selectedCourses, applied]
            });
        });
    }
});

function filterCoursesOnPage(selectedCourses, applied) {
    let courseLinks = [];
    const myCoursesToggle = document.querySelector('a.dropdown-toggle[title="My courses"]');
    if (myCoursesToggle) {
        const dropdownMenu = myCoursesToggle.parentElement.querySelector('.dropdown-menu');
        if (dropdownMenu) {
            const items = dropdownMenu.querySelectorAll('a[href*="course/view.php"]');
            courseLinks = Array.from(items);
        }
    }
    courseLinks.forEach(item => {
        const listItem = item.closest('li');
        if (!listItem) return;
        const href = item.href;
        const shouldShow = selectedCourses.includes(href);
        listItem.style.display = (applied && !shouldShow) ? 'none' : 'block';
    });
} 