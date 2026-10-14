import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import "./blog.css";
const REPORT_ROUTE = "/reportissue";

// import bannerImage from "../assets/bl.png";
import bannerImageEn from "../assets/bl.png";
import bannerImageHi from "../assets/bl-hi.png";
import bannerImageMr from "../assets/bl-mr.jpeg";

import blogImage1 from "../assets/r5.jpg";
import blogImage2 from "../assets/r6.jpg";
import blogImage3 from "../assets/r7.jpg";
import blogImage4 from "../assets/r8.jpg";
import blogImage5 from "../assets/r9.jpg";
import blogImage6 from "../assets/r10.jpg";
import blogImage7 from "../assets/r11.jpg";

const articles = [
  {
    key: "roadHazards",
    image: blogImage2,
    reverse: false,
  },
  {
    key: "reportingWebsites",
    image: blogImage3,
    reverse: true,
  },
  {
    key: "communityEngagement",
    image: blogImage4,
    reverse: false,
  },
  {
    key: "futureTrends",
    image: blogImage5,
    reverse: true,
  },
];

const galleryImages = [blogImage1, blogImage6, blogImage7];

const videos = [
  {
    id: "nIeNr4zRTaM",
    key: "reportingIssues",
  },
  {
    id: "bhiF00-nvv8",
    key: "complaintLifecycle",
  },
  {
    id: "RHXSqObnHDU",
    key: "communityStories",
  },
];

const ContactItem = ({ icon, title, children }) => (
  <div className="contact-strip-item">
    <span className="contact-strip-icon">{icon}</span>
    <div>
      <h4>{title}</h4>
      {children}
    </div>
  </div>
);

const Blog = () => {
const { t, i18n } = useTranslation();
const navigate = useNavigate();

const currentLanguage = (
  i18n.resolvedLanguage || i18n.language || "en"
).split("-")[0];

const bannerImage =
  {
    en: bannerImageEn,
    hi: bannerImageHi,
    mr: bannerImageMr,
  }[currentLanguage] || bannerImageEn;
  return (
    <main className="blog-page">
      {/* ================= PAGE HERO ================= */}
      <section className="page-hero-section">
        <div
          className="page-hero"
          id="home"
          style={{
            backgroundImage: `url("${bannerImage}")`,
          }}
        >
          <div className="hero-scrim"></div>

          <div className="page-hero-inner">
            <div className="hero-cta-row">
              {/* Existing hero content was commented out. */}
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURED IMAGE ================= */}
      <section className="section featured-section">
        <div className="featured-frame">
          <img
            src={galleryImages[0]}
            alt={t("blog.gallery.featuredAlt")}
          />

          <div className="featured-caption">
            <p className="eyebrow">
              {t("blog.gallery.featuredLabel")}
            </p>

            <h2>{t("blog.gallery.featuredTitle")}</h2>
          </div>
        </div>
      </section>

      {/* ================= ARTICLES ================= */}
      <section className="section">
        <div className="section-heading center">
          <p className="eyebrow center">
            {t("blog.articles.sectionLabel")}
          </p>

          <h2>{t("blog.articles.sectionTitle")}</h2>
        </div>

        <div className="articles-list">
          {articles.map((article) => (
            <article
              className={`article-row ${
                article.reverse ? "reverse" : ""
              }`}
              key={article.key}
            >
              <div className="article-media">
                <img
                  src={article.image}
                  alt={t(`blog.articles.${article.key}.title`)}
                />
              </div>

              <div className="article-copy">
                <span className="article-tag">
                  {t(`blog.articles.${article.key}.tag`)}
                </span>

                <h3>
                  {t(`blog.articles.${article.key}.title`)}
                </h3>

                <p>
                  {t(`blog.articles.${article.key}.paragraph1`)}
                </p>

                <p>
                  {t(`blog.articles.${article.key}.paragraph2`)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ================= GALLERY ================= */}
      <section className="section surface">
        <div className="section-heading center">
          <p className="eyebrow center">
            {t("blog.gallery.sectionLabel")}
          </p>

          <h2>{t("blog.gallery.sectionTitle")}</h2>
        </div>

        <div className="gallery-grid">
          {[blogImage6, blogImage7, blogImage1].map((img, i) => (
            <div className="gallery-frame" key={i}>
              <img
                src={img}
                alt={t("blog.gallery.snapshotAlt", {
                  number: i + 1,
                })}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ================= VIDEO SECTION ================= */}
      <section className="section">
        <div className="section-heading center">
          <p className="eyebrow center">
            {t("blog.videos.sectionLabel")}
          </p>

          <h2>{t("blog.videos.sectionTitle")}</h2>
        </div>

        <div className="video-grid">
          {videos.map((video) => (
            <div className="video-card" key={video.id}>
              <div className="video-frame">
                <iframe
                  src={`https://www.youtube.com/embed/${video.id}`}
                  title={t(`blog.videos.${video.key}`)}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>

              <h4>{t(`blog.videos.${video.key}`)}</h4>
            </div>
          ))}
        </div>
      </section>

      {/* ================= CONTACT / ADDRESS ================= */}
      <section className="section surface">
        <div className="contact-strip">
          <ContactItem
            icon="📍"
            title={t("blog.contact.address")}
          >
            <p>
              312, 3rd Floor, Gera Imperium Rise, Maharashtra, India
            </p>
          </ContactItem>

          <ContactItem
            icon="📞"
            title={t("blog.contact.phone")}
          >
            <p>
              <a href="tel:+918956324316">
                +91-8956324316
              </a>
            </p>
          </ContactItem>

          <ContactItem
            icon="✉️"
            title={t("blog.contact.email")}
          >
            <p>
              <a href="mailto:contact@myroadindia.com">
                contact@myroadindia.com
              </a>
            </p>
          </ContactItem>
        </div>
      </section>

      {/* ================= CALL TO ACTION ================= */}
      <section className="section cta-section">
        <div className="cta-shell">
          <div>
            <h3>{t("blog.cta.title")}</h3>

            <p>{t("blog.cta.description")}</p>
          </div>

          <button
            className="primary-btn"
            type="button"
            onClick={() => navigate(REPORT_ROUTE)}
          >
            {t("blog.cta.button")} <span>→</span>
          </button>
        </div>
      </section>
    </main>
  );
};

export default Blog;