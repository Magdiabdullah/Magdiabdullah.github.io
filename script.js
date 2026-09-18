/* =========================================================
   MAGDI SAAD
   PORTFOLIO INTERFACE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {


        const selectorButtons =
            document.querySelectorAll(
                ".selector-item"
            );


        const sections =
            document.querySelectorAll(
                "[data-section-content]"
            );


        const topLinks =
            document.querySelectorAll(
                ".top-link"
            );


        const menuToggle =
            document.getElementById(
                "menuToggle"
            );


        const topNav =
            document.getElementById(
                "topNav"
            );


        const openButtons =
            document.querySelectorAll(
                "[data-open-section]"
            );



        /* =================================================
           HIDE ALL SECTIONS
        ================================================== */

        function hideAllSections() {

            sections.forEach(
                section => {

                    section.classList.remove(
                        "visible"
                    );

                }
            );

        }



        /* =================================================
           CLOSE MOBILE MENU
        ================================================== */

        function closeMenu() {

            if (topNav) {

                topNav.classList.remove(
                    "open"
                );

            }


            if (menuToggle) {

                menuToggle.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }

        }



        /* =================================================
           SELECT BUTTON
        ================================================== */

        function updateSelector(
            sectionId
        ) {

            selectorButtons.forEach(
                button => {

                    button.classList.toggle(

                        "active",

                        button.dataset.section
                            === sectionId

                    );

                }
            );

        }



        /* =================================================
           TOP NAV ACTIVE
        ================================================== */

        function updateTopNavigation(
            sectionId
        ) {

            topLinks.forEach(
                link => {

                    const href =
                        link.getAttribute(
                            "href"
                        );


                    link.classList.toggle(

                        "active",

                        href ===
                            `#${sectionId}`

                    );

                }
            );

        }



        /* =================================================
           SHOW SECTION
        ================================================== */

        function showSection(
            sectionId
        ) {


            const target =
                document.getElementById(
                    sectionId
                );


            if (!target) {
                return;
            }


            hideAllSections();


            updateSelector(
                sectionId
            );


            target.classList.add(
                "visible"
            );


            closeMenu();


            /*
             * Give the browser a moment
             * to render the section.
             */

            setTimeout(
                () => {

                    target.scrollIntoView({

                        behavior:
                            "smooth",

                        block:
                            "start"

                    });

                },
                50
            );

        }



        /* =================================================
           ABOUT
        ================================================== */

        function showHome() {

            hideAllSections();


            updateSelector(
                "about"
            );


            updateTopNavigation(
                "home"
            );


            window.scrollTo({

                top: 0,

                behavior:
                    "smooth"

            });


            closeMenu();

        }



        /* =================================================
           SECTION BUTTONS
        ================================================== */

        selectorButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const sectionId =
                            button.dataset.section;


                        /*
                         * About is the
                         * initial interface.
                         */

                        if (
                            sectionId ===
                            "about"
                        ) {

                            showHome();

                            return;

                        }


                        showSection(
                            sectionId
                        );

                    }
                );

            }
        );



        /* =================================================
           HERO ABOUT BUTTON
        ================================================== */

        openButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const sectionId =
                            button.dataset.openSection;


                        if (
                            sectionId ===
                            "about"
                        ) {

                            showHome();

                            return;

                        }


                        showSection(
                            sectionId
                        );

                    }
                );

            }
        );



        /* =================================================
           TOP NAV
        ================================================== */

        topLinks.forEach(
            link => {

                link.addEventListener(
                    "click",
                    event => {

                        const href =
                            link.getAttribute(
                                "href"
                            );


                        /*
                         * Let normal links such as
                         * securityhub.html work.
                         */

                        if (
                            !href ||
                            !href.startsWith("#")
                        ) {

                            return;

                        }


                        event.preventDefault();


                        const sectionId =
                            href.substring(1);


                        if (
                            sectionId ===
                            "home"
                        ) {

                            showHome();

                            return;

                        }


                        if (
                            sectionId ===
                            "about"
                        ) {

                            showSection(
                                "about"
                            );

                            return;

                        }


                        if (
                            sectionId ===
                            "contact"
                        ) {

                            showSection(
                                "contact"
                            );

                            return;

                        }

                    }
                );

            }
        );



        /* =================================================
           MOBILE MENU
        ================================================== */

        if (
            menuToggle &&
            topNav
        ) {

            menuToggle.addEventListener(
                "click",
                () => {

                    const opened =
                        topNav.classList.toggle(
                            "open"
                        );


                    menuToggle.setAttribute(

                        "aria-expanded",

                        String(opened)

                    );

                }
            );

        }



        /* =================================================
           INITIAL STATE
        ================================================== */

        hideAllSections();


        updateSelector(
            "about"
        );


        updateTopNavigation(
            "home"
        );



        /* =================================================
           URL HASH SUPPORT
        ================================================= */

        const hash =
            window.location.hash.substring(
                1
            );


        if (hash) {

            const target =
                document.getElementById(
                    hash
                );


            if (
                target &&
                target.hasAttribute(
                    "data-section-content"
                )
            ) {

                setTimeout(
                    () => {

                        showSection(
                            hash
                        );

                    },
                    100
                );

            }

        }

    }
);