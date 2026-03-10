/* COLOR PALETTE */
:root{
    --bg-main:#EAEFEF;
    --bg-soft:#BFC9D1;
    --text-main:#25343F;
    --accent:#FF9B51;
}

/* GLOBAL */
body{
    margin:0;
    font-family:"Inter",sans-serif;
    background:var(--bg-main);
    color:var(--text-main);
}

/* HERO */
.about-hero{
    text-align:center;
    padding:100px 10%;
}

.about-hero h1{
    font-size:48px;
    margin-bottom:16px;
}

.about-hero h1 span{
    color:var(--accent);
}

.about-subtext{
    max-width:700px;
    margin:auto;
    font-size:18px;
    line-height:1.6;
}

.about-subtext span{
    color:var(--accent);
}

/* BUTTONS */
.about-buttons{
    margin-top:30px;
    display:flex;
    justify-content:center;
    gap:15px;
}

.gold-btn{
    background:var(--accent);
    border:none;
    padding:12px 28px;
    border-radius:6px;
    color:white;
    font-size:15px;
    cursor:pointer;
}

.outline-btn{
    background:transparent;
    border:1px solid var(--accent);
    padding:12px 28px;
    border-radius:6px;
    color:var(--accent);
    font-size:15px;
}

/* COUNTERS */
.counter-section{
    padding:60px 10%;
    display:flex;
    justify-content:center;
    gap:60px;
    text-align:center;
}

.counter-box h2{
    font-size:36px;
    color:var(--accent);
}

/* FEATURES */
.about-features{
    padding:60px 10%;
    display:flex;
    justify-content:center;
    flex-wrap:wrap;
    gap:25px;
}

.feature-card{
    width:300px;
    padding:24px;
    background:white;
    border-radius:8px;
    border:1px solid var(--bg-soft);
}

/* TIMELINE */
.timeline{
    padding:60px 12%;
}

.timeline-title{
    text-align:center;
    font-size:32px;
    margin-bottom:40px;
}

.timeline-item{
    padding-left:16px;
    margin-bottom:24px;
    border-left:3px solid var(--accent);
}

.timeline-item.right{
    border-left:none;
    border-right:3px solid var(--accent);
    padding-right:16px;
    text-align:right;
}

/* TEAM */
.team-section{
    padding:60px 10%;
}

.team-title{
    text-align:center;
    font-size:32px;
    margin-bottom:40px;
}

.team-container{
    display:flex;
    justify-content:center;
    gap:25px;
    flex-wrap:wrap;
}

.team-card{
    width:220px;
    padding:20px;
    text-align:center;
    background:white;
    border-radius:8px;
    border:1px solid var(--bg-soft);
}

.team-photo{
    width:110px;
    height:110px;
    border-radius:50%;
    background:var(--bg-soft);
    margin:auto;
    margin-bottom:12px;
}

/* REMOVE ANIMATIONS */
.reveal{
    opacity:1;
    transform:none;
    transition:none;
}
