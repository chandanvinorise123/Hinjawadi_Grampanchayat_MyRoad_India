import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, toMediaUrl } from "../utils/dashboardApi";
import "./blog.css";
const REPORT_ROUTE = "/reportissue";

// import bannerImage from "../assets/bl.png";
import bannerImageEn from "../assets/bl.png";
import bannerImageHi from "../assets/bl-hi.png";
import bannerImageMr from "../assets/bl-mr.jpeg";

import blogImage1 from "../assets/r5.jpg";
import blogImage2 from "../assets/R6.jpg";
import blogImage3 from "../assets/R7.jpg";
import blogImage4 from "../assets/R8.jpg";
import blogImage5 from "../assets/R9.jpg";
import blogImage6 from "../assets/R10.jpg";
import blogImage7 from "../assets/R11.jpg";

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

const getBlogClientId = () => {
  try {
    const storedId = window.localStorage.getItem("blogClientId");
    if (storedId) return storedId;

    const clientId = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `blog-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem("blogClientId", clientId);
    return clientId;
  } catch (error) {
    console.error("Unable to persist blog visitor ID:", error);
    return `blog-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

const formatTimeAgo = (dateValue, t) => {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(dateValue).getTime()) / 1000)
  );
  if (elapsedSeconds < 60) {
    return t("blog.liveUpdates.secondsAgo", { count: elapsedSeconds });
  }
  if (elapsedSeconds < 3600) {
    return t("blog.liveUpdates.minutesAgo", { count: Math.floor(elapsedSeconds / 60) });
  }
  if (elapsedSeconds < 86400) {
    return t("blog.liveUpdates.hoursAgo", { count: Math.floor(elapsedSeconds / 3600) });
  }
  return t("blog.liveUpdates.daysAgo", { count: Math.floor(elapsedSeconds / 86400) });
};

const ReportedImagesSection = ({ onOpenImage }) => {
  const { t } = useTranslation();
  const [clientId] = useState(getBlogClientId);
  const [images, setImages] = useState([]);
  const [statusCounts, setStatusCounts] = useState({
    registered: 0,
    assigned: 0,
    underAction: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [openCommentCardKey, setOpenCommentCardKey] = useState(null);
  const [photoViews, setPhotoViews] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [pendingActions, setPendingActions] = useState(() => new Set());
  const [tickerIndex, setTickerIndex] = useState(0);
  const carouselRef = useRef(null);
  const isInteractingRef = useRef(false);
  const interactionTimerRef = useRef(null);

  const tickerReports = Array.from(
    new Map(images.map((image) => [image.complaintId, image])).values()
  );
  const urgentReports = tickerReports.filter((report) =>
    ["urgent", "critical"].includes(String(report.priority || "").toLowerCase()) &&
    !["resolved", "closed"].includes(String(report.status || "").toLowerCase())
  );
  const tickerMessages = [
    ...tickerReports.map((report) => ({
      kind: "report",
      text: t("blog.liveUpdates.tickerStory", {
        issue: report.issueType || report.category || t("blog.liveUpdates.reportedIssue"),
        location: report.location || "Hinjawadi",
        number: report.complaintNumber || t("blog.liveUpdates.reportedIssue"),
        status: report.status || t("blog.liveUpdates.reportedIssue"),
        time: formatTimeAgo(report.createdAt, t),
      }),
    })),
    {
      kind: "emergency",
      text: urgentReports.length
        ? t("blog.liveUpdates.emergencyUrgent", { count: urgentReports.length })
        : t("blog.liveUpdates.emergencyAdvice"),
    },
    {
      kind: "work",
      text: t("blog.liveUpdates.liveWorkSummary", {
        registered: statusCounts.registered,
        assigned: statusCounts.assigned,
        underAction: statusCounts.underAction,
        resolved: statusCounts.resolved,
      }),
    },
  ];
  const currentTickerMessage =
    tickerMessages[tickerIndex % tickerMessages.length];

  useEffect(() => {
    if (tickerMessages.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setTickerIndex((current) => (current + 1) % tickerMessages.length);
    }, 12000);
    return () => window.clearInterval(timer);
  }, [tickerMessages.length]);

  useEffect(
    () => () => window.clearTimeout(interactionTimerRef.current),
    []
  );

  useEffect(() => {
    let active = true;
    let initialLoad = true;
    let timer;

    const refreshFeed = async () => {
      if (initialLoad || document.visibilityState === "visible") {
        initialLoad = false;
        try {
          const response = await fetch(
            `${API_BASE_URL}/blog/feed?clientId=${encodeURIComponent(clientId)}`,
            { headers: { Accept: "application/json" } }
          );
          const data = await response.json();
          if (!response.ok || data.success === false) {
            throw new Error(data.message || `Feed request failed (${response.status})`);
          }
          if (active) {
            setImages(data.images || []);
            setStatusCounts(data.statusCounts || {
              registered: 0,
              assigned: 0,
              underAction: 0,
              resolved: 0,
            });
            setFeedError("");
            setLoading(false);
          }
        } catch (error) {
          console.error("Unable to load reported images:", error);
          if (active) {
            setFeedError(error.message || "Unable to load reported images.");
            setLoading(false);
          }
        }
      }

      if (active) timer = window.setTimeout(refreshFeed, 1000);
    };

    refreshFeed();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [clientId]);

  useEffect(() => {
    if (images.length < 2) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    let animationFrame;
    let previousTime = 0;
    const animate = (time) => {
      const carousel = carouselRef.current;
      if (!carousel) return;

      if (!isInteractingRef.current && previousTime) {
        const elapsed = Math.min(time - previousTime, 50);
        const loopWidth =
          carousel.children[images.length]?.offsetLeft || carousel.scrollWidth / 2;
        if (loopWidth > 0) {
          carousel.scrollLeft += elapsed * 0.016;
          if (carousel.scrollLeft >= loopWidth) {
            carousel.scrollLeft -= loopWidth;
          }
        }
      }

      previousTime = time;
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [images.length]);

  const moveCarousel = (direction) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const card = carousel.querySelector(".reported-image-card");
    const cardWidth = card?.getBoundingClientRect().width || carousel.clientWidth;
    const loopWidth =
      carousel.children[images.length]?.offsetLeft || carousel.scrollWidth / 2;
    const nextPosition = carousel.scrollLeft + direction * (cardWidth + 18);

    isInteractingRef.current = true;
    window.clearTimeout(interactionTimerRef.current);
    if (direction < 0 && carousel.scrollLeft <= 1 && loopWidth > 0) {
      carousel.scrollLeft = Math.max(0, loopWidth - cardWidth - 18);
    } else if (direction > 0 && nextPosition >= loopWidth && loopWidth > 0) {
      carousel.scrollLeft = 0;
    } else {
      carousel.scrollTo({ left: nextPosition, behavior: "smooth" });
    }

    interactionTimerRef.current = window.setTimeout(() => {
      isInteractingRef.current = false;
    }, 2400);
  };

  const toggleReaction = async (image, reaction) => {
    if (pendingActions.has(image.id)) return;
    setPendingActions((current) => new Set(current).add(image.id));

    try {
      const response = await fetch(
        `${API_BASE_URL}/blog/feed/${image.complaintId}/${image.imageIndex}/like`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            clientId,
            reaction,
            action:
              reaction === "thumb"
                ? image.thumbedByClient
                  ? "unlike"
                  : "like"
                : image.heartedByClient
                  ? "unlike"
                  : "like",
          }),
        }
      );
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || `Like request failed (${response.status})`);
      }
      setImages((current) =>
        current.map((item) =>
          item.id === image.id
            ? {
                ...item,
                thumbs: data.thumbs,
                thumbedByClient: data.thumbedByClient,
                hearts: data.hearts,
                heartedByClient: data.heartedByClient,
              }
            : item
        )
      );
    } catch (error) {
      console.error("Unable to update image reaction:", error);
      setFeedError(error.message || "Unable to update the reaction.");
    } finally {
      setPendingActions((current) => {
        const next = new Set(current);
        next.delete(image.id);
        return next;
      });
    }
  };

  const submitComment = async (event, image) => {
    event.preventDefault();
    const text = (commentDrafts[image.id] || "").trim();
    if (!text || text.length > 500 || pendingActions.has(image.id)) return;
    setPendingActions((current) => new Set(current).add(image.id));

    try {
      const response = await fetch(
        `${API_BASE_URL}/blog/feed/${image.complaintId}/${image.imageIndex}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ clientId, text }),
        }
      );
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || `Comment request failed (${response.status})`);
      }
      setImages((current) =>
        current.map((item) =>
          item.id === image.id
            ? {
                ...item,
                comments: [...item.comments.slice(-4), { text, createdAt: new Date().toISOString() }],
                commentCount: item.commentCount + 1,
              }
            : item
        )
      );
      setCommentDrafts((current) => ({ ...current, [image.id]: "" }));
    } catch (error) {
      console.error("Unable to post image comment:", error);
      setFeedError(error.message || "Unable to post the comment.");
    } finally {
      setPendingActions((current) => {
        const next = new Set(current);
        next.delete(image.id);
        return next;
      });
    }
  };

  const carouselImages =
    images.length > 1 ? [...images, ...images] : images;

  return (
    <section className="section reported-issues-section" aria-labelledby="reported-issues-title">
      <div className="reported-issues-heading">
        <div className="reported-live-label"><span aria-hidden="true">⚡</span> {t("blog.liveUpdates.label")}</div>
        <h2 id="reported-issues-title">{t("blog.liveUpdates.title")}</h2>
        <p>{t("blog.liveUpdates.description")}</p>
      </div>

      {feedError && <p className="reported-feed-error" role="alert">{feedError}</p>}
      {loading ? (
        <p className="reported-feed-message" role="status">{t("blog.liveUpdates.loading")}</p>
      ) : (
        <>
          <div className="reported-news-ticker" aria-live="off">
            <span className="reported-news-ticker-label">
              <span aria-hidden="true" className="reported-news-ticker-dot" />
              {t("blog.liveUpdates.tickerLabel")}
            </span>
            <span className="reported-news-ticker-window">
              <span
                className={`reported-news-ticker-story ticker-${currentTickerMessage.kind}`}
                key={tickerIndex % tickerMessages.length}
              >
                {currentTickerMessage.text}
              </span>
            </span>
          </div>
          {images.length === 0 ? (
            <p className="reported-feed-message">{t("blog.liveUpdates.empty")}</p>
          ) : (
            <>
          <div
            className="reported-carousel-shell"
            onMouseEnter={() => { isInteractingRef.current = true; }}
            onMouseLeave={() => { isInteractingRef.current = false; }}
            onFocus={() => { isInteractingRef.current = true; }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                isInteractingRef.current = false;
              }
            }}
          >
            <button
              type="button"
              className="reported-carousel-arrow reported-carousel-arrow-left"
              onClick={() => moveCarousel(-1)}
              aria-label={t("blog.liveUpdates.previous")}
            >
              ‹
            </button>
            <div
              className="reported-image-carousel"
              ref={carouselRef}
              style={{ "--reported-image-count": Math.min(images.length, 3) }}
              aria-label={t("blog.liveUpdates.carouselLabel")}
            >
              {carouselImages.map((image, index) => {
                const isDuplicate = index >= images.length;
                const commentCardKey = `${image.id}:${isDuplicate ? "copy" : "original"}`;
                const showBeforeAfter =
                  Boolean(image.afterImageUrl) &&
                  ["verified", "resolved", "closed"].includes(
                    String(image.status || "").toLowerCase()
                  );
                const showAfterPhoto =
                  showBeforeAfter && photoViews[image.id] === "after";
                const photoUrl = showAfterPhoto
                  ? image.afterImageUrl
                  : image.imageUrl;
                const photoAlt = showAfterPhoto
                  ? t("blog.liveUpdates.afterImageAlt", {
                      issue: image.issueType || image.category || t("blog.liveUpdates.reportedIssue"),
                      location: image.location || "Hinjawadi",
                    })
                  : t("blog.liveUpdates.imageAlt", {
                      issue: image.issueType || image.category || t("blog.liveUpdates.reportedIssue"),
                      location: image.location || "Hinjawadi",
                    });
                return (
                <article
                  className="reported-image-card"
                  key={`${image.id}-${isDuplicate ? "copy" : "original"}`}
                  aria-hidden={isDuplicate}
                >
                <div className="reported-image-wrap">
                  <div className="reported-photo-panel">
                    <img
                      src={toMediaUrl(photoUrl)}
                      alt={photoAlt}
                      loading="lazy"
                      role="button"
                      aria-label={t("blog.liveUpdates.previewImage")}
                      tabIndex={isDuplicate ? -1 : 0}
                      onClick={() => onOpenImage({
                        src: toMediaUrl(photoUrl),
                        alt: photoAlt,
                      })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onOpenImage({
                            src: toMediaUrl(photoUrl),
                            alt: photoAlt,
                          });
                        }
                      }}
                    />
                    {showBeforeAfter && (
                      <div className="reported-photo-switch" role="group" aria-label={t("blog.liveUpdates.photoViewLabel")}>
                        <button
                          type="button"
                          className={!showAfterPhoto ? "active" : ""}
                          aria-pressed={!showAfterPhoto}
                          tabIndex={isDuplicate ? -1 : undefined}
                          onClick={() => setPhotoViews((current) => ({ ...current, [image.id]: "before" }))}
                        >
                          {t("blog.liveUpdates.beforePhoto")}
                        </button>
                        <button
                          type="button"
                          className={showAfterPhoto ? "active" : ""}
                          aria-pressed={showAfterPhoto}
                          tabIndex={isDuplicate ? -1 : undefined}
                          onClick={() => setPhotoViews((current) => ({ ...current, [image.id]: "after" }))}
                        >
                          {t("blog.liveUpdates.afterPhoto")}
                        </button>
                      </div>
                    )}
                  </div>
                  <span className={`reported-status status-${String(image.status || "new").toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                    {image.status || "New"}
                  </span>
                </div>
                <div className="reported-image-details">
                  <div className="reported-title-row">
                    <h3>{image.issueType || image.category || t("blog.liveUpdates.reportedIssue")}</h3>
                    <div className="reported-reactions">
                      <button
                        type="button"
                        className={`reported-reaction-button reported-thumb-reaction ${image.thumbedByClient ? "liked" : ""}`}
                        onClick={() => toggleReaction(image, "thumb")}
                        disabled={pendingActions.has(image.id)}
                        aria-pressed={image.thumbedByClient}
                        aria-label={t(image.thumbedByClient ? "blog.liveUpdates.unlikeThumb" : "blog.liveUpdates.likeThumb")}
                        tabIndex={isDuplicate ? -1 : undefined}
                      >
                        <svg className="reported-thumb-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v11H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3Zm0 0 4.2-7a2 2 0 0 1 2.7-.7c.8.5 1.2 1.4 1 2.3L14 10h5.2a2.8 2.8 0 0 1 2.7 3.5l-1.8 6A3.5 3.5 0 0 1 16.7 22H7" /></svg>
                        <span>{image.thumbs}</span>
                      </button>
                      <button
                        type="button"
                        className={`reported-reaction-button reported-heart-reaction ${image.heartedByClient ? "liked" : ""}`}
                        onClick={() => toggleReaction(image, "heart")}
                        disabled={pendingActions.has(image.id)}
                        aria-pressed={image.heartedByClient}
                        aria-label={t(image.heartedByClient ? "blog.liveUpdates.unlikeHeart" : "blog.liveUpdates.likeHeart")}
                        tabIndex={isDuplicate ? -1 : undefined}
                      >
                        <svg className="reported-heart-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
                        <span>{image.hearts}</span>
                      </button>
                    </div>
                  </div>
                  <p className="reported-location"><span aria-hidden="true">⌖</span> {image.location || "Hinjawadi, Pune"}</p>
                  <div className="reported-image-meta">
                    <span>{formatTimeAgo(image.createdAt, t)}</span>
                    <span>#{image.complaintNumber || "Reported"}</span>
                  </div>
                  <div className="reported-image-actions">
                    <button
                      type="button"
                      className="reported-comment-toggle"
                      onClick={() => setOpenCommentCardKey((current) => current === commentCardKey ? null : commentCardKey)}
                      aria-expanded={openCommentCardKey === commentCardKey}
                      tabIndex={isDuplicate ? -1 : undefined}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" /></svg>
                      <span>{t("blog.liveUpdates.commentsCount", { count: image.commentCount })}</span>
                    </button>
                  </div>
                  {openCommentCardKey === commentCardKey && (
                    <div className="reported-comments">
                      <div className="reported-comment-list">
                        {image.comments.length ? image.comments.slice(-5).map((comment, index) => (
                          <p key={`${image.id}-comment-${index}`}><strong>{t("blog.liveUpdates.resident")}</strong> {comment.text}</p>
                        )) : <p className="reported-no-comments">{t("blog.liveUpdates.firstComment")}</p>}
                      </div>
                      <form onSubmit={(event) => submitComment(event, image)}>
                        <input
                          type="text"
                          value={commentDrafts[image.id] || ""}
                          onChange={(event) => setCommentDrafts((current) => ({ ...current, [image.id]: event.target.value }))}
                          placeholder={t("blog.liveUpdates.commentPlaceholder")}
                          aria-label={t("blog.liveUpdates.commentPlaceholder")}
                          maxLength={500}
                          tabIndex={isDuplicate ? -1 : undefined}
                        />
                        <button type="submit" disabled={!String(commentDrafts[image.id] || "").trim() || pendingActions.has(image.id)} tabIndex={isDuplicate ? -1 : undefined}>{t("blog.liveUpdates.post")}</button>
                      </form>
                    </div>
                  )}
                </div>
                </article>
                );
              })}
            </div>
            <button
              type="button"
              className="reported-carousel-arrow reported-carousel-arrow-right"
              onClick={() => moveCarousel(1)}
              aria-label={t("blog.liveUpdates.next")}
            >
              ›
            </button>
          </div>
          <div className="reported-image-indicators" aria-hidden="true">
            {tickerReports.slice(0, 8).map((report, index) => (
              <span className={tickerIndex < tickerReports.length && index === tickerIndex ? "active" : ""} key={report.complaintId} />
            ))}
          </div>
            </>
          )}
        </>
      )}
    </section>
  );
};

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

  // ===== CLICK-TO-ZOOM (added) =====
  const [zoom, setZoom] = useState(null);

  const handleImageClick = (e) => {
    const frame = e.target.closest(
      ".featured-frame, .article-media, .gallery-frame"
    );
    if (!frame) return;
    const img = frame.querySelector("img");
    if (img) setZoom({ src: img.src, alt: img.alt });
  };

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e) => {
      if (e.key === "Escape") setZoom(null);
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("lightbox-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("lightbox-open");
    };
  }, [zoom]);
  // ===== END CLICK-TO-ZOOM =====

  return (
    <main className="blog-page" onClick={handleImageClick}>
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

      <ReportedImagesSection onOpenImage={setZoom} />

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

      {/* ================= IMAGE ZOOM POPUP (added) ================= */}
      <div
        className={`img-lightbox ${zoom ? "open" : ""}`}
        onClick={() => setZoom(null)}
      >
        <button
          type="button"
          className="img-lightbox-close"
          aria-label="Close image"
          onClick={() => setZoom(null)}
        >
          &times;
        </button>
        {zoom && <img src={zoom.src} alt={zoom.alt} />}
      </div>
    </main>
  );
};

export default Blog;
