document.addEventListener('DOMContentLoaded', function() {
    const coursesList = document.getElementById('coursesList');

    let selectedCourses = [];
    let allCourses = [];
    let applied = false;

    // load from chrome.storage.local
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
                if (results && results[0] && results[0].result) {
                    allCourses = results[0].result;
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

    function renderCourses() {
        let html = '';
        let showCourses = applied ? allCourses.filter(c => selectedCourses.includes(c.href)) : allCourses;
        html += `<h4>Your Courses (${showCourses.length})</h4>`;
        showCourses.forEach(course => {
            html += `
                <div class="course-item">
                    <input type="checkbox" 
                           class="course-checkbox" 
                           id="course-${course.href}" 
                           data-href="${course.href}" 
                           ${applied && selectedCourses.includes(course.href) ? 'checked' : ''}>
                    <label class="course-label" for="course-${course.href}">
                        ${course.title}
                    </label>
                </div>
            `;
        });
        html += `
            <div style="margin-top: 20px; text-align: center;">
                <button id="applyBtn" class="btn btn-primary" style="padding: 10px 20px; font-size: 14px;">Apply Selection</button>
                <button id="resetBtn" class="btn btn-secondary" style="padding: 10px 20px; font-size: 14px; margin-left: 10px;">Reset</button>
            </div>
        `;
        coursesList.innerHTML = html;

        const checkboxes = coursesList.querySelectorAll('input[type=checkbox]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectedCourses.includes(checkbox.dataset.href);
            checkbox.addEventListener('change', function() {
                const href = this.dataset.href;
                if (this.checked) {
                    if (!selectedCourses.includes(href)) {
                        selectedCourses.push(href);
                    }
                } else {
                    selectedCourses = selectedCourses.filter(id => id !== href);
                }
            });
        });

        const applyBtn = document.getElementById('applyBtn');
        if (applyBtn) {
            applyBtn.addEventListener('click', function() {
                applied = true;
                chrome.storage.local.set({
                    'applied': true,
                    'visibleCourses': JSON.stringify(selectedCourses)
                }, () => {
                    renderCourses();
                    applyCourseFilter();
                    this.textContent = 'Applied!';
                    this.style.background = '#28a745';
                    setTimeout(() => {
                        this.textContent = 'Apply Selection';
                        this.style.background = '#007bff';
                    }, 2000);
                });
            });
        }

        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function() {
                applied = false;
                selectedCourses = [];
                chrome.storage.local.set({
                    'applied': false,
                    'visibleCourses': JSON.stringify([])
                }, () => {
                    renderCourses();
                    applyCourseFilter();
                });
            });
        }
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
        if (applied) {
            listItem.style.display = shouldShow ? 'block' : 'none';
        } else {
            listItem.style.display = 'block';
        }
    });
} 