/* =========================================================
   MAGDI SAAD PORTFOLIO
   INTERACTION CONTROLLER
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTS
    ===================================================== */

    const selectorItems =
        document.querySelectorAll(".selector-item");

    const sections =
        document.querySelectorAll("[data-section-content]");

    const navLinks =
        document.querySelectorAll("[data-nav]");

    const openSectionLinks =
        document.querySelectorAll("[data-open-section]");

    const menuToggle =
        document.getElementById("menuToggle");

    const mobileNav =
        document.getElementById("mobileNav");

    const cursorGlow =
        document.querySelector(".cursor-glow");


    /* =====================================================
       SECTION FUNCTIONS
    ===================================================== */

    function hideAllSections() {

        sections.forEach(section => {

            section.classList.remove("visible");

        });

    }


    function activateSelector(sectionName) {

        selectorItems.forEach(item => {

            const isActive =
                item.dataset.section === sectionName;

            item.classList.toggle(
                "active",
                isActive
            );

        });

    }


    function activateNavigation(navName) {

        navLinks.forEach(link => {

            const isActive =
                link.dataset.nav === navName;

            link.classList.toggle(
                "active",
                isActive
            );

        });

    }


    function openSection(sectionName, shouldScroll = true) {

        const target =
            document.getElementById(sectionName);

        if (!target) {
            return;
        }


        hideAllSections();


        target.classList.add("visible");


        activateSelector(sectionName);


        if (
            sectionName === "about" ||
            sectionName === "education" ||
            sectionName === "experience" ||
            sectionName === "projects" ||
            sectionName === "skills" ||
            sectionName === "certificates" ||
            sectionName === "publications"
        ) {

            activateNavigation("about");

        }


        if (sectionName === "contact") {

            activateNavigation("contact");

        }


        if (shouldScroll) {

            setTimeout(() => {

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }, 40);

        }

    }


    /* =====================================================
       DEFAULT STATE
    ===================================================== */

    hideAllSections();


    const initialHash =
        window.location.hash
            .replace("#", "")
            .trim();


    if (
        initialHash &&
        document.getElementById(initialHash)
    ) {

        openSection(
            initialHash,
            false
        );

    } else {

        openSection(
            "about",
            false
        );

    }


    /* =====================================================
       SECTION SELECTORS
    ===================================================== */

    selectorItems.forEach(item => {

        item.addEventListener("click", () => {

            const sectionName =
                item.dataset.section;

            openSection(
                sectionName,
                true
            );


            history.replaceState(
                null,
                "",
                `#${sectionName}`
            );

        });

    });


    /* =====================================================
       VIEW MY WORK
    ===================================================== */

    openSectionLinks.forEach(link => {

        link.addEventListener("click", event => {

            event.preventDefault();

            const sectionName =
                link.dataset.openSection;

            openSection(
                sectionName,
                true
            );


            history.replaceState(
                null,
                "",
                `#${sectionName}`
            );

        });

    });


    /* =====================================================
       TOP NAVIGATION
    ===================================================== */

    navLinks.forEach(link => {

        link.addEventListener("click", event => {

            const navName =
                link.dataset.nav;


            if (!navName) {
                return;
            }


            event.preventDefault();


            if (navName === "home") {

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

                activateNavigation("home");

                closeMobileMenu();

                return;

            }


            if (navName === "about") {

                openSection(
                    "about",
                    true
                );

                history.replaceState(
                    null,
                    "",
                    "#about"
                );

                closeMobileMenu();

                return;

            }


            if (navName === "contact") {

                openSection(
                    "contact",
                    true
                );

                history.replaceState(
                    null,
                    "",
                    "#contact"
                );

                closeMobileMenu();

            }

        });

    });


    /* =====================================================
       MOBILE MENU
    ===================================================== */

    function openMobileMenu() {

        if (!mobileNav || !menuToggle) {
            return;
        }


        mobileNav.classList.add("open");


        menuToggle.setAttribute(
            "aria-expanded",
            "true"
        );

    }


    function closeMobileMenu() {

        if (!mobileNav || !menuToggle) {
            return;
        }


        mobileNav.classList.remove("open");


        menuToggle.setAttribute(
            "aria-expanded",
            "false"
        );

    }


    if (menuToggle) {

        menuToggle.addEventListener(
            "click",
            () => {

                const isOpen =
                    mobileNav.classList.contains("open");


                if (isOpen) {

                    closeMobileMenu();

                } else {

                    openMobileMenu();

                }

            }
        );

    }


    /* =====================================================
       CLOSE MOBILE MENU WHEN CLICKING OUTSIDE
    ===================================================== */

    document.addEventListener(
        "click",
        event => {

            if (!mobileNav || !menuToggle) {
                return;
            }


            const clickedInsideMenu =
                mobileNav.contains(event.target);


            const clickedButton =
                menuToggle.contains(event.target);


            if (
                !clickedInsideMenu &&
                !clickedButton
            ) {

                closeMobileMenu();

            }

        }
    );


    /* =====================================================
       ESCAPE KEY
    ===================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (event.key === "Escape") {

                closeMobileMenu();

            }

        }
    );


    /* =====================================================
       CURSOR GLOW
    ===================================================== */

    if (
        cursorGlow &&
        window.matchMedia(
            "(pointer: fine)"
        ).matches
    ) {

        document.addEventListener(
            "mousemove",
            event => {

                cursorGlow.style.left =
                    `${event.clientX}px`;

                cursorGlow.style.top =
                    `${event.clientY}px`;

                document.body.classList.add(
                    "cursor-active"
                );

            }
        );


        document.addEventListener(
            "mouseleave",
            () => {

                document.body.classList.remove(
                    "cursor-active"
                );

            }
        );

    }


    /* =====================================================
       INTERACTIVE HOVER ELEMENTS
    ===================================================== */

    const interactiveElements =
        document.querySelectorAll(
            ".hero-name, " +
            ".hero-role, " +
            ".selector-item, " +
            ".hero-btn, " +
            ".social-row a, " +
            ".project-card, " +
            ".skill-card, " +
            ".certificate-card, " +
            ".research-card, " +
            ".experience-card, " +
            ".contact-links a, " +
            ".hub-button"
        );


    interactiveElements.forEach(element => {

        element.addEventListener(
            "mouseenter",
            () => {

                element.classList.add(
                    "is-hovered"
                );

            }
        );


        element.addEventListener(
            "mouseleave",
            () => {

                element.classList.remove(
                    "is-hovered"
                );

            }
        );


        element.addEventListener(
            "touchstart",
            () => {

                element.classList.add(
                    "is-touched"
                );

            },
            {
                passive: true
            }
        );


        element.addEventListener(
            "touchend",
            () => {

                setTimeout(() => {

                    element.classList.remove(
                        "is-touched"
                    );

                }, 180);

            },
            {
                passive: true
            }
        );

    });


    /* =====================================================
       UPDATE ACTIVE SECTION WHEN HASH CHANGES
    ===================================================== */

    window.addEventListener(
        "hashchange",
        () => {

            const hash =
                window.location.hash
                    .replace("#", "")
                    .trim();


            if (
                hash &&
                document.getElementById(hash)
            ) {

                openSection(
                    hash,
                    true
                );

            }

        }
    );

});