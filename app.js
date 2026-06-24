// Global Configuration
const frameCount = 296;
const images = [];
let loadedCount = 0;
let currentFrameIndex = 0;

// Elements
const preloader = document.getElementById("preloader");
const loaderBar = document.getElementById("loader-bar");
const loaderPercentage = document.getElementById("loader-percentage");
const canvas = document.getElementById("scroll-canvas");
const context = canvas.getContext("2d");
const section = document.getElementById("animation-section");
const captionCards = document.querySelectorAll(".caption-card");
const activeStepProgress = document.getElementById("active-step-progress");
const currentStepText = document.querySelector(".current-step");
const heroOverlay = document.querySelector(".hero-overlay-wrapper");

// Format frame file name, e.g. "ezgif-frame-001.jpg"
const pad = (num, size) => num.toString().padStart(size, '0');

// Preload Images
function preloadImages() {
  return new Promise((resolve) => {
    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      // Path is relative to the website root
      img.src = `./jpg folder/ezgif-frame-${pad(i, 3)}.jpg`;
      img.onload = () => {
        loadedCount++;
        const percent = Math.round((loadedCount / frameCount) * 100);
        loaderBar.style.width = `${percent}%`;
        loaderPercentage.innerText = `${percent}%`;

        if (loadedCount === frameCount) {
          resolve();
        }
      };
      img.onerror = () => {
        // Handle individual load error by counting it to avoid hanging preloader
        loadedCount++;
        const percent = Math.round((loadedCount / frameCount) * 100);
        loaderBar.style.width = `${percent}%`;
        loaderPercentage.innerText = `${percent}%`;
        if (loadedCount === frameCount) {
          resolve();
        }
      };
      images.push(img);
    }
  });
}

// Canvas Drawer (with dynamic watermark removal and full-screen cover layout)
function drawFrame(index) {
  const img = images[index];
  if (!img || !img.complete) return;

  context.clearRect(0, 0, canvas.width, canvas.height);

  const canvasRatio = canvas.width / canvas.height;
  const imgRatio = img.width / img.height;

  let drawWidth, drawHeight, drawX, drawY;

  // Immersive full-screen Cover math (inverse of contain)
  if (canvasRatio < imgRatio) {
    // Canvas is taller than the image aspect ratio (fit heights, center/crop widths)
    drawHeight = canvas.height;
    drawWidth = img.width * (canvas.height / img.height);
    drawX = (canvas.width - drawWidth) / 2;
    drawY = 0;
  } else {
    // Canvas is wider than the image aspect ratio (fit widths, center/crop heights)
    drawWidth = canvas.width;
    drawHeight = img.height * (canvas.width / img.width);
    drawX = 0;
    drawY = (canvas.height - drawHeight) / 2;
  }

  // Draw main frame
  context.drawImage(img, drawX, drawY, drawWidth, drawHeight);

  // Content-Aware Watermark Removal:
  // We copy a clean adjacent patch from (x=1000, y=575, w=100, h=70)
  // and draw it over the watermark region (x=1100, y=575, w=100, h=70) with a resolution-scaled blur
  // to seamlessly blend the edges into the studio floor gradient.
  const patchSrcX = 1000;
  const patchSrcY = 575;
  const patchWidth = 100;
  const patchHeight = 70;
  const patchDstX = 1100;
  const patchDstY = 575;

  const scaleX = drawWidth / img.naturalWidth;
  const scaleY = drawHeight / img.naturalHeight;

  context.save();
  const blurVal = Math.round(3 * scaleX); // Resolution-scaled blur (approx 9px on 4K)
  context.filter = `blur(${blurVal}px)`;
  context.drawImage(
    img,
    patchSrcX, patchSrcY, patchWidth, patchHeight, // Source clean region
    drawX + patchDstX * scaleX, drawY + patchDstY * scaleY, patchWidth * scaleX, patchHeight * scaleY // Target cover (blurred edges)
  );
  context.restore();
}

// Resize Canvas to fit screen (supporting high-DPI/4K resolutions scaled 2x)
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // Capped at 2x for crisp rendering without lag
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  
  // Enable high-quality image smoothing
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  
  drawFrame(currentFrameIndex);
}

// Handle Page Scroll
function handleScroll() {
  const sectionRect = section.getBoundingClientRect();
  const totalScrollable = section.offsetHeight - window.innerHeight;
  
  // Calculate progress within the sticky section
  let scrolled = -sectionRect.top;
  let progress = scrolled / totalScrollable;
  progress = Math.max(0, Math.min(1, progress));

  // Fade out hero overlay at the start of scroll (from 0 to 0.15 progress)
  if (heroOverlay) {
    const fadeLimit = 0.15;
    const opacity = Math.max(0, 1 - (progress / fadeLimit));
    heroOverlay.style.opacity = opacity;
    heroOverlay.style.visibility = opacity === 0 ? "hidden" : "visible";
    heroOverlay.style.pointerEvents = opacity < 0.1 ? "none" : "auto";
  }

  // Calculate matching frame index (animation starts after hero fades out)
  const animStartProgress = 0.15;
  let animProgress = 0;
  if (progress > animStartProgress) {
    animProgress = (progress - animStartProgress) / (1 - animStartProgress);
  }

  const frameIndex = Math.floor(animProgress * (frameCount - 1));
  currentFrameIndex = frameIndex;

  // Render frame
  drawFrame(frameIndex);

  // Update Progress Line
  activeStepProgress.style.width = `${animProgress * 100}%`;

  // Update Captions and Step Counter
  let activeStep = "01";
  captionCards.forEach((card) => {
    const start = parseInt(card.getAttribute("data-frame-start"), 10);
    const end = parseInt(card.getAttribute("data-frame-end"), 10);
    
    // Check if the current frame falls in range
    const frameNum = frameIndex + 1; // 1-indexed for the attribute values
    if (progress > animStartProgress && frameNum >= start && frameNum <= end) {
      card.classList.add("active");
      const stepText = card.querySelector(".caption-step").innerText;
      activeStep = stepText.split(" / ")[0];
    } else {
      card.classList.remove("active");
    }
  });

  currentStepText.innerText = activeStep;
}

// Init Website
window.addEventListener("DOMContentLoaded", async () => {
  // Start preloading images immediately
  await preloadImages();

  // Hide Preloader
  preloader.classList.add("fade-out");

  // Initial canvas resize and draw
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Initial scroll calculation
  handleScroll();

  // Throttled high-performance scroll listener (eliminates scroll lag)
  let scrollTick = false;
  window.addEventListener("scroll", () => {
    if (!scrollTick) {
      window.requestAnimationFrame(() => {
        handleScroll();
        scrollTick = false;
      });
      scrollTick = true;
    }
  }, { passive: true });

  // Initialize interactive components
  initMobileMenu();
  initCalculator();
  initContactForm();
});

// Mobile Navigation Menu Toggle
function initMobileMenu() {
  const menuBtn = document.querySelector(".mobile-menu-btn");
  const navLinksContainer = document.querySelector(".nav-links");
  const navLinks = document.querySelectorAll(".nav-link");

  menuBtn.addEventListener("click", () => {
    navLinksContainer.classList.toggle("open-mobile");
    menuBtn.classList.toggle("open");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      navLinksContainer.classList.remove("open-mobile");
      menuBtn.classList.remove("open");
    });
  });

  // Inject Mobile Nav CSS logic via standard DOM
  const style = document.createElement("style");
  style.innerHTML = `
    @media (max-width: 768px) {
      .nav-links.open-mobile {
        display: flex;
        flex-direction: column;
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: var(--bg-dark);
        justify-content: center;
        align-items: center;
        gap: 32px;
        z-index: 1050;
      }
      .mobile-menu-btn.open .bar:nth-child(1) {
        transform: translateY(8px) rotate(45deg);
      }
      .mobile-menu-btn.open .bar:nth-child(2) {
        opacity: 0;
      }
      .mobile-menu-btn.open .bar:nth-child(3) {
        transform: translateY(-8px) rotate(-45deg);
      }
    }
  `;
  document.head.appendChild(style);
}

// Interactive Calculator for Cemented Pipes
function initCalculator() {
  const destSelect = document.getElementById("calc-destination");
  const diameterSelect = document.getElementById("calc-diameter");
  const classSelect = document.getElementById("calc-class");

  const resWeight = document.getElementById("res-weight");
  const resPn = document.getElementById("res-pn");
  const resCost = document.getElementById("res-cost");
  const ctaBtn = document.getElementById("calc-cta-btn");

  // Custom Pricing and Availability Database:
  // key: diameter in feet
  // values: 2mp cost, 3mp cost
  const pricingData = {
    "0.50": { "2mp": 700, "3mp": null },
    "0.75": { "2mp": 1200, "3mp": null },
    "1.00": { "2mp": 1400, "3mp": null },
    "1.50": { "2mp": 2200, "3mp": 3500 },
    "2.00": { "2mp": 3200, "3mp": 5500 },
    "3.00": { "2mp": null, "3mp": null } // Contact Sales
  };

  function updateClassDropdown() {
    const diaVal = diameterSelect.value;
    const priceSet = pricingData[diaVal];
    const option3MP = classSelect.querySelector('option[value="3mp"]');

    if (priceSet && priceSet["3mp"] === null) {
      // 3MP is not available for this size, disable it
      option3MP.disabled = true;
      if (classSelect.value === "3mp") {
        classSelect.value = "2mp"; // Fallback to 2MP
      }
    } else {
      option3MP.disabled = false;
    }
  }

  function calculate() {
    // First update the Class dropdown availability
    updateClassDropdown();

    const destOpt = destSelect.options[destSelect.selectedIndex];
    const destFactor = parseFloat(destOpt.getAttribute("data-factor"));

    const diaVal = diameterSelect.value;
    const diaOpt = diameterSelect.options[diameterSelect.selectedIndex];
    const totalWeight = parseFloat(diaOpt.getAttribute("data-weight"));

    const classVal = classSelect.value;
    const priceSet = pricingData[diaVal];

    // Reset CTA button text
    ctaBtn.innerText = "Order Quote With These Specs";

    if (diaVal === "3.00") {
      // 3.00 ft pipe requires custom details/contact sales
      resWeight.innerText = `${totalWeight.toLocaleString()} kg`;
      resPn.innerText = classVal === "3mp" ? "3 MPa (NP3)" : "2 MPa (NP2)";
      resCost.innerText = "Contact Sales";
      ctaBtn.innerText = "Request Custom Quote for 3ft Pipe";
    } else {
      const basePrice = priceSet[classVal];
      if (basePrice !== null) {
        const estimatedCost = basePrice * destFactor;
        resWeight.innerText = `${totalWeight.toLocaleString()} kg`;
        resPn.innerText = classVal === "3mp" ? "3 MPa (NP3)" : "2 MPa (NP2)";
        resCost.innerText = `₹${Math.round(estimatedCost).toLocaleString("en-IN")}`;
      }
    }
  }

  // Bind Events
  destSelect.addEventListener("change", calculate);
  diameterSelect.addEventListener("change", calculate);
  classSelect.addEventListener("change", calculate);

  // Initial calculation
  calculate();

  // CTA Click - Copy specs to form and navigate
  ctaBtn.addEventListener("click", () => {
    const destText = destSelect.options[destSelect.selectedIndex].text;
    const diaText = diameterSelect.options[diameterSelect.selectedIndex].text;
    const classText = classSelect.options[classSelect.selectedIndex].text;
    const weight = resWeight.innerText;
    const strengthSpec = resPn.innerText;
    const cost = resCost.innerText;

    const messageTextarea = document.getElementById("contact-message");
    messageTextarea.value = `Hi AV Homepipe, I would like to request a custom quote based on the following specifications:
- Delivery Location: ${destText}
- Required Length: 8 Feet (Fixed)
- Nominal Diameter: ${diaText}
- Cemented Pipe Class: ${classText}
- Strength Spec: ${strengthSpec}
- Total Weight: ${weight}
- Estimated Price (GST & Shipping incl.): ${cost}
Please get in touch with me soon!`;

    // Navigate smoothly to contact form
    document.getElementById("contact").scrollIntoView({ behavior: "smooth" });
  });
}

// Contact Form & Success Modal
function initContactForm() {
  const form = document.getElementById("quote-form");
  const modal = document.getElementById("success-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    
    // Show success modal
    modal.classList.add("show");
  });

  closeModalBtn.addEventListener("click", () => {
    modal.classList.remove("show");
    form.reset();
  });

  // Close modal when clicking outside the content
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("show");
      form.reset();
    }
  });
}

// Highlight active Nav Link on scroll
const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll("section");

window.addEventListener("scroll", () => {
  let currentActive = "";
  const scrollY = window.scrollY;
  
  sections.forEach((sect) => {
    const sectionTop = sect.offsetTop;
    if (scrollY >= sectionTop - 150) {
      currentActive = sect.getAttribute("id");
    }
  });

  // Overrides for unified Hero & Process section inside #animation-section
  if (currentActive === "animation-section") {
    const totalScrollable = section.offsetHeight - window.innerHeight;
    const progress = scrollY / totalScrollable;
    if (progress >= 0.15) {
      currentActive = "process-start";
    }
  }

  navLinks.forEach((link) => {
    link.classList.remove("active");
    const href = link.getAttribute("href");
    if (href === `#${currentActive}`) {
      link.classList.add("active");
    }
  });
});
