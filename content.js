chrome.storage.local.get(['visibleCourses', 'applied'], (result) => {
    try {
        const applied = result.applied === true;
        const selectedCourses = JSON.parse(result.visibleCourses || '[]');
        if (!applied || !Array.isArray(selectedCourses)) return;

        const myCoursesToggle = document.querySelector('a.dropdown-toggle[title="My courses"]');
        if (myCoursesToggle) {
            const dropdownMenu = myCoursesToggle.parentElement.querySelector('.dropdown-menu');
            if (dropdownMenu) {
                const items = dropdownMenu.querySelectorAll('a[href*="course/view.php"]');
                items.forEach(item => {
                    const listItem = item.closest('li');
                    if (!listItem) return;
                    const href = item.href;
                    const shouldShow = selectedCourses.includes(href);
                    listItem.style.display = shouldShow ? 'block' : 'none';
                });
            }
        }
    } catch (e) {
    }
}); 