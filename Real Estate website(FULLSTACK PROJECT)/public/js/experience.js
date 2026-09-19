(() => {
    'use strict';

    const revealItems = Array.from(document.querySelectorAll('.reveal'));
    if (!revealItems.length) return;

    const reveal = element => {
        element.classList.add('active', 'is-visible');
    };

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) {
        revealItems.forEach(reveal);
        return;
    }

    revealItems.forEach((element, index) => {
        element.style.setProperty('--reveal-delay', `${Math.min(index * 55, 220)}ms`);
    });

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            reveal(entry.target);
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -48px' });

    revealItems.forEach(element => observer.observe(element));
})();
