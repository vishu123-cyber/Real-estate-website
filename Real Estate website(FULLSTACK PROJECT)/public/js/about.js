(() => {
    'use strict';

    const statsSection = document.querySelector('[data-about-stats]');
    const counters = Array.from(document.querySelectorAll('.stat-number[data-target]'));
    if (!statsSection || !counters.length) return;

    const setFinalValue = counter => {
        counter.textContent = `${counter.dataset.target}${counter.dataset.suffix || ''}`;
    };

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !('IntersectionObserver' in window)) {
        counters.forEach(setFinalValue);
        return;
    }

    let animated = false;
    const animateCounter = counter => {
        const target = Number(counter.dataset.target);
        const suffix = counter.dataset.suffix || '';
        const start = performance.now();
        const duration = 850;

        const update = now => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            counter.textContent = `${Math.round(target * eased)}${suffix}`;
            if (progress < 1) requestAnimationFrame(update);
        };

        requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(entries => {
        if (animated || !entries.some(entry => entry.isIntersecting)) return;
        animated = true;
        counters.forEach(animateCounter);
        observer.disconnect();
    }, { threshold: 0.25 });

    observer.observe(statsSection);
})();
