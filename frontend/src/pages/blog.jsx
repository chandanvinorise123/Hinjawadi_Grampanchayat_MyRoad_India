import React from "react";
import "./blog.css";
import bannerImage from "../assets/bl.png";

import blogImage1 from "../assets/r5.jpg";
import blogImage2 from "../assets/r6.jpg";
import blogImage3 from "../assets/r7.jpg";
import blogImage4 from "../assets/r8.jpg";
import blogImage5 from "../assets/r9.jpg";
import blogImage6 from "../assets/r10.jpg";
import blogImage7 from "../assets/r11.jpg";

const articles = [
  {
    tag: "Road Safety",
    title: "Understanding Road Hazards and Damages",
    image: blogImage2,
    paragraphs: [
      "Road hazards and damages encompass various conditions that can jeopardize the safety of drivers and pedestrians. These hazards take multiple forms, including but not limited to potholes, debris, and adverse weather conditions that may create dangerous driving situations. Not only can potholes cause immediate vehicle damage, such as tire blowouts and suspension issues, but they can also lead to accidents if drivers swerve to avoid them.",
      "Another common road hazard is debris, which can include fallen branches, loose gravel, or other objects that obstruct the roadway. This type of hazard poses a threat as drivers may suddenly react to avoid hitting debris, resulting in loss of control or potential collisions with other vehicles. Additionally, hazardous conditions such as ice, snow, or heavy rain create slippery surfaces and reduced visibility, increasing the likelihood of accidents and personal injury.",
    ],
    reverse: false,
  },
  {
    tag: "Digital Platforms",
    title: "How Road Hazard Reporting Websites Work",
    image: blogImage3,
    paragraphs: [
      "Road hazard reporting websites serve as essential tools for enhancing public safety by enabling citizens to report hazardous conditions on roadways. These platforms simplify the reporting process through user-friendly interfaces, allowing individuals to submit information about various road hazards, including potholes, fallen debris, or malfunctioning traffic signals. Users can typically report issues via desktop or mobile applications, ensuring accessibility across a wide range of demographics.",
      "Thus, road hazard reporting websites not only empower citizens by giving them a voice in maintaining traffic safety but also enhance the collaboration between the public and local authorities, contributing significantly to safeguarding road users. This is the exact principle MyRoad India is built on — turning every citizen report into a tracked, actionable complaint.",
    ],
    reverse: true,
  },
  {
    tag: "Community",
    title: "The Impact of Community Engagement on Road Safety",
    image: blogImage4,
    paragraphs: [
      "Community engagement plays a pivotal role in enhancing road safety, primarily through the reporting of hazards and damages. When local residents actively participate in the identification and communication of road issues, it leads to quicker resolutions by relevant authorities. Engaged communities are more vigilant, often noticing problems that might be overlooked in routine inspections.",
      "This proactive approach to road hazard reporting not only ensures timely repairs but also significantly reduces the risk of accidents caused by neglected road conditions. In summary, the integration of community engagement into road hazard reporting not only accelerates the resolution of issues but also instills a sense of shared responsibility among residents.",
    ],
    reverse: false,
  },
  {
    tag: "Innovation",
    title: "Future Trends in Road Hazard Reporting",
    image: blogImage5,
    paragraphs: [
      "The future of road hazard reporting is poised for significant advancement, driven by emerging technologies and innovative solutions. One of the most promising trends is the development of mobile applications dedicated to hazard reporting. These applications can empower drivers and pedestrians to promptly report road conditions directly from their smartphones — with user-friendly interfaces that facilitate instant submissions of photographs, descriptions, and GPS locations of hazards.",
      "As these trends develop, the overall efficiency of the reporting process will improve significantly, leading to faster response times from authorities. Enhanced collaboration among civic agencies, technology developers, and community members will result in safer roads for all users — a future MyRoad India is actively building toward.",
    ],
    reverse: true,
  },
];

const galleryImages = [blogImage1, blogImage6, blogImage7];

const videos = [
  { id: "nIeNr4zRTaM", title: "Reporting road issues, made simple" },
  { id: "bhiF00-nvv8", title: "Inside the complaint lifecycle" },
  { id: "RHXSqObnHDU", title: "Community stories from the field" },
];

const Blog = () => {
  return (
    <main className="blog-page">
      {/* ================= PAGE HERO — banner as full-cover background ================= */}
      <section
        className="page-hero"
        id="home"
        style={{ backgroundImage: `url(${bannerImage})` }}
      >
        <div className="hero-scrim"></div>
        <div className="page-hero-inner">
          <div className="hero-cta-row">
            <button className="primary-btn" type="button">
              Report an Issue <span>→</span>
            </button>
          {/* <div className="breadcrumb">
            Home / <b>Blog</b>
          </div>
          <p className="eyebrow eyebrow-light">MyRoad India Blog</p>
          <h1>Insights on road safety & community reporting</h1>
          <p className="hero-lead">
            Stories, guidance, and ideas on how better roads get built —
            one report, one repair, and one community at a time.
          </p> */}
        </div>
        </div>
      </section>

      {/* ================= FEATURED IMAGE ================= */}
      <section className="section featured-section">
        <div className="featured-frame">
          <img src={galleryImages[0]} alt="Road infrastructure in the community" />
          <div className="featured-caption">
            <p className="eyebrow">Featured</p>
            <h2>Better roads start with what we notice — and report</h2>
          </div>
        </div>
      </section>

      {/* ================= ARTICLES ================= */}
      <section className="section">
        <div className="section-heading center">
          <p className="eyebrow center">Latest Articles</p>
          <h2>What we're writing about</h2>
        </div>

        <div className="articles-list">
          {articles.map((article, i) => (
            <article className={`article-row ${article.reverse ? "reverse" : ""}`} key={i}>
              <div className="article-media">
                <img src={article.image} alt={article.title} />
              </div>
              <div className="article-copy">
                <span className="article-tag">{article.tag}</span>
                <h3>{article.title}</h3>
                {article.paragraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ================= GALLERY ================= */}
      <section className="section surface">
        <div className="section-heading center">
          <p className="eyebrow center">From the Field</p>
          <h2>Snapshots of roads, repairs, and reports</h2>
        </div>
        <div className="gallery-grid">
          {[blogImage6, blogImage7, blogImage1].map((img, i) => (
            <div className="gallery-frame" key={i}>
              <img src={img} alt={`MyRoad India field snapshot ${i + 1}`} />
            </div>
          ))}
        </div>
      </section>

      {/* ================= VIDEO SECTION ================= */}
      <section className="section">
        <div className="section-heading center">
          <p className="eyebrow center">Watch & Learn</p>
          <h2>MyRoad India on video</h2>
        </div>
        <div className="video-grid">
          {videos.map((video, i) => (
            <div className="video-card" key={i}>
              <div className="video-frame">
                <iframe
                  src={`https://www.youtube.com/embed/${video.id}`}
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
              <h4>{video.title}</h4>
            </div>
          ))}
        </div>
      </section>

      {/* ================= CONTACT / ADDRESS ================= */}
      <section className="section surface">
        <div className="contact-strip">
          <div className="contact-strip-item">
            <span className="contact-strip-icon">📍</span>
            <div>
              <h4>Address</h4>
              <p>312, 3rd Floor, Gera Imperium Rise, Maharashtra, India</p>
            </div>
          </div>
          <div className="contact-strip-item">
            <span className="contact-strip-icon">📞</span>
            <div>
              <h4>Phone</h4>
              <p>
                <a href="tel:+918956324316">+91-8956324316</a>
              </p>
            </div>
          </div>
          <div className="contact-strip-item">
            <span className="contact-strip-icon">✉️</span>
            <div>
              <h4>Email</h4>
              <p>
                <a href="mailto:contact@myroadindia.com">contact@myroadindia.com</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="section cta-section">
        <div className="cta-shell">
          <div>
            <h3>Seen a hazard on your road today?</h3>
            <p>Report it on MyRoad India — it takes less than two minutes.</p>
          </div>
          <button className="primary-btn" type="button">
            Report an Issue <span>→</span>
          </button>
        </div>
      </section>
    </main>
  );
};

export default Blog;