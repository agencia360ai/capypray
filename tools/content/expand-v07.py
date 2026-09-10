"""One-off content expansion → pack 0.7.0: stories (parables), scenes, place prayers, World 2 "Everywhere",
longer World 1 lessons, lobby strings. Idempotent (skips ids that already exist)."""
import json
p = "packages/content/packs/christian-us-en-v1/pack.json"
d = json.load(open(p))

def say(text, clip="talk_a", audio=None, mood=None):
    b = {"type": "avatar_say", "clip": clip, "text": text}
    if audio: b["audio"] = audio
    if mood: b["mood"] = mood
    return b

STORIES = [
 ("lost-sheep", "The Lost Sheep", "Luke 15:3-7", "sheep", [
   ("A shepherd had one hundred sheep. He loved every single one.", "sheep"),
   ("One little sheep wandered off and got lost in the hills.", "hills"),
   ("The shepherd left the ninety-nine and went looking. Up and down, calling its name.", "shepherd"),
   ("He found it! He carried it home on his shoulders, so happy.", "hug"),
   ("Jesus said: God is like that shepherd. He never stops looking for you.", "heart")],
   "God always comes looking for you. You are never lost to Him."),
 ("good-samaritan", "The Kind Stranger", "Luke 10:25-37", "road", [
   ("A man was walking on a lonely road. Robbers hurt him and left him there.", "road"),
   ("A busy man walked by. He did not stop.", "walk"),
   ("Another man walked by. He looked away and kept going.", "walk"),
   ("Then a stranger stopped. He cleaned the hurts, gave water, and took him to rest.", "hug"),
   ("Jesus said: be like the kind stranger. Help anyone who needs it.", "heart")],
   "Being kind to someone who needs help is a prayer with your hands."),
 ("mustard-seed", "The Tiny Seed", "Matthew 13:31-32", "seed", [
   ("Jesus held up a mustard seed. It was tiny, smaller than a crumb.", "seed"),
   ("Someone planted it in the garden and waited.", "sprout"),
   ("It grew, and grew, and grew into a big tree!", "tree"),
   ("Birds came and made nests in its branches.", "bird"),
   ("Jesus said: a little faith grows big. Even tiny prayers grow.", "heart")],
   "Your small prayer is a seed. God makes it grow."),
 ("calm-storm", "Jesus Calms the Storm", "Mark 4:35-41", "boat", [
   ("Jesus and his friends sailed across the lake in a boat.", "boat"),
   ("A big storm came. Waves splashed in! The friends were scared.", "storm"),
   ("Jesus was asleep. They woke him: Help us!", "sleepy"),
   ("Jesus stood up and said: Quiet! Be still. The wind stopped.", "calm"),
   ("The friends whispered: even the wind listens to Him.", "heart")],
   "When you are scared, tell Jesus. He can calm the storm inside you."),
 ("loaves-fish", "Five Loaves, Two Fish", "John 6:1-14", "bread", [
   ("A huge crowd came to hear Jesus. Everyone was hungry.", "people"),
   ("A boy had five small breads and two fish. He shared them.", "bread"),
   ("Jesus said thank you to God, and broke the bread.", "pray"),
   ("Everyone ate until they were full. Thousands of people!", "happy"),
   ("There were twelve baskets left over.", "plate")],
   "Say thank you before you eat, and share what you have. God makes it enough."),
 ("zacchaeus", "Zacchaeus in the Tree", "Luke 19:1-10", "tree", [
   ("Zacchaeus was very short and nobody liked him. He took too much money.", "sad"),
   ("Jesus was coming! Zacchaeus climbed a tree to see.", "tree"),
   ("Jesus stopped and said: Zacchaeus, come down. I want to visit your house!", "house"),
   ("Zacchaeus was so happy. He gave the money back, and more.", "happy"),
   ("Jesus is a friend to everyone, even when others say no.", "heart")],
   "Jesus wants to be your friend, exactly as you are."),
 ("jesus-children", "Jesus and the Children", "Mark 10:13-16", "friends", [
   ("Moms and dads brought their kids to see Jesus.", "family"),
   ("The helpers said: go away, Jesus is too busy for kids!", "grab"),
   ("Jesus said: No! Let the children come to me.", "wave"),
   ("He hugged them and blessed them, one by one.", "hug"),
   ("Jesus said: kids know how to trust. Everyone should be like them.", "heart")],
   "You are never too small to talk to God. He loves your voice."),
 ("prodigal-son", "The Son Who Came Home", "Luke 15:11-32", "house", [
   ("A son took his money and ran far away from home.", "walk"),
   ("He spent it all. Soon he was hungry and sad.", "sad"),
   ("He thought: I will go home and say I'm sorry.", "heart-mend"),
   ("His dad saw him far away and ran to hug him!", "hug"),
   ("They had a party. Dad said: my son was lost, now he's found.", "happy")],
   "When you say sorry, God runs to hug you. Always."),
 ("two-houses", "Two Houses", "Matthew 7:24-27", "house", [
   ("Jesus told about two builders.", "blocks"),
   ("One built his house on sand. Easy and fast!", "sand"),
   ("The other built on rock. It took longer.", "rock"),
   ("Rain came, wind blew. The sand house fell down. Splash!", "storm"),
   ("The rock house stood strong. Jesus said: listen to my words, and you are on rock.", "house")],
   "Praying every day builds your house on rock."),
 ("sower", "The Farmer and the Seeds", "Matthew 13:3-9", "seeds", [
   ("A farmer threw seeds everywhere.", "seeds"),
   ("Some fell on the path. Birds ate them.", "bird"),
   ("Some fell on rocks. They dried up in the sun.", "rock"),
   ("Some fell in weeds and got squished.", "bush"),
   ("Some fell on good soil and grew tall. A hundred times more!", "sprout")],
   "Keep your heart like good soil: listen, and God's words will grow."),
]
have = {s["id"] for s in d.setdefault("stories", [])}
for sid, title, ref, icon, pages, moral in STORIES:
    if sid in have: continue
    d["stories"].append({"id": sid, "title": title, "ref": ref, "icon": icon,
        "pages": [{"text": t, "icon": ic, "audio": f"st_{sid}_{i+1}.mp3"} for i, (t, ic) in enumerate(pages)],
        "moral": moral, "moralAudio": f"st_{sid}_m.mp3"})

def prayer(pid, skill, lines, title=None):
    if any(x["id"] == pid for x in d["prayers"]): return
    d["prayers"].append({"id": pid, "skillId": skill, "title": title or pid,
        "lines": [{"text": t, "audio": f"p_{pid.replace('-', '_')}_{i+1}.mp3"} for i, t in enumerate(lines)],
        "variables": ["kidName"] if any("{kidName}" in t for t in lines) else []})
prayer("place-bedroom", "hello", ["Good morning, God. It's me, {kidName}.", "Thank you for a new day.", "Stay with me today. Amen."], "Good Morning")
prayer("place-garden", "thank-you", ["God, you make things grow.", "Thank you for flowers and bugs and rain.", "Help me grow too. Amen."], "In the Garden")
prayer("place-park", "thank-you", ["God, look at this big sky!", "Thank you for trees and birds and running.", "You made it all. Amen."], "At the Park")
prayer("place-city", "others", ["God, so many people are here.", "Please take care of each one.", "Help me be kind today. Amen."], "In the City")
prayer("place-school", "please-help", ["God, help me listen and learn.", "Help me be brave when it's hard.", "Help me be a good friend. Amen."], "At School")
prayer("place-car", "please-help", ["God, keep us safe on the road.", "Thank you for places to go.", "Bring us home happy. Amen."], "In the Car")
prayer("place-night", "shared", ["God, it's dark but you are here.", "Thank you for today.", "Keep my family safe tonight. Amen."], "Goodnight")

SCENES = [
 ("pond", "The Pond", "lantern", "meadow", "auto", None, {}),
 ("bedroom", "My Room", "bed", "bedroom", "auto", "place-bedroom", {}),
 ("kitchen", "The Kitchen", "plate", "kitchen", "day", "grace-god-is-great", {}),
 ("garden", "The Garden", "sprout", "garden", "day", "place-garden", {"lessonId": "w1d2"}),
 ("park", "The Park", "tree", "park", "day", "place-park", {"lessonId": "w1d4"}),
 ("city", "The City", "city", "city", "auto", "place-city", {"lessonId": "w2d1"}),
 ("school", "School", "school", "school", "day", "place-school", {"lessonId": "w2d3"}),
 ("car", "The Car", "car", "car", "day", "place-car", {"lessonId": "w3d1"}),
]
have = {s["id"] for s in d.setdefault("scenes", [])}
for sid, title, icon, bg, time, pr, unlock in SCENES:
    if sid in have: continue
    sc = {"id": sid, "title": title, "icon": icon, "background": bg, "time": time, "unlock": unlock}
    if pr: sc["prayerId"] = pr
    d["scenes"].append(sc)

if not any(w["id"] == "everywhere" for w in d["worlds"]):
    d["worlds"].append({"id": "everywhere", "title": "Everywhere", "weeks": ["w5", "w6"]})
W2 = [
 ("w5d1", "kitchen", "thank-you", "Thank You for Food", "loaves-fish", "grace-god-is-great", "mg_w1d5_grace_order",
  ["Hi {kidName}! Sniff sniff. Something smells yummy in the kitchen.", "Before we eat, we say thank you. That's a kitchen prayer!"],
  "Yum! Thank you prayers taste even better than oranges."),
 ("w5d2", "bedroom", "hello", "Good Morning, God", "two-houses", "place-bedroom", "mg_w1d2_places",
  ["Good morning, {kidName}! Stretch! Yawn! A brand new day.", "The first thing I do every day is say hi to God."],
  "Say good morning to God tomorrow too. He loves it."),
 ("w5d3", "garden", "thank-you", "Things Grow", "mustard-seed", "place-garden", "mg_w1d4_gratitude_garden",
  ["Look, {kidName}! Tiny green sprouts in the garden.", "God makes seeds grow. And He grows us too, little by little."],
  "You grew a little today. I saw it!"),
 ("w5d4", "park", "thank-you", "God Made All This", "sower", "place-park", "mg_w2d1_senses",
  ["We're at the park, {kidName}! Feel the wind? Hear the birds?", "Everything you see, God made. Let's say thank you out loud."],
  "Next time you're outside, whisper thank you. God hears."),
 ("w5d5", "city", "others", "People Everywhere", "good-samaritan", "place-city", "mg_w4d2_world_helpers",
  ["So many people in the city, {kidName}! Buses, shops, busy feet.", "Every person has a name God knows. We can pray for them, even strangers."],
  "You prayed for a whole city. Wow!"),
 ("w5d6", "school", "please-help", "Before a Hard Thing", "calm-storm", "place-school", "mg_w3d4_breathe_ask_go",
  ["School day, {kidName}! Sometimes things at school feel hard.", "When I'm scared, I breathe and ask God for help. Let's practice."],
  "Breathe, ask, go. You've got this."),
 ("w5d7", "car", "shared", "On the Road", "lost-sheep", "place-car", "mg_w1d7_review",
  ["Vroom! We're in the car, {kidName}. Where are we going?", "Wherever we go, God comes too. Let's pray for a safe trip."],
  "Every trip is better with a prayer. Buckle up!"),
 ("w6d1", "kitchen", "others", "Sharing", "loaves-fish", "for-others-v1", "mg_w2d5_kind_words",
  ["Hi {kidName}! I have two oranges. Who should I share with?", "Jesus shared bread with everyone. Sharing is a way to love."],
  "Sharing makes two happy tummies. Bye!"),
 ("w6d2", "bedroom", "please-help", "Scared at Night", "calm-storm", "scared-v1", "mg_w3d3_comfort",
  ["Psst, {kidName}. Sometimes the dark feels scary. Even for me.", "Jesus calmed a big storm. He can calm my heart too."],
  "God is with you in the dark. Sleep tight."),
 ("w6d3", "park", "others", "Helping Hands", "good-samaritan", "for-others-v1", "mg_w2d5_kind_words",
  ["At the park, {kidName}, I saw a kid fall down. What should I do?", "Helping is praying with your hands. Let's practice being kind."],
  "Your hands can pray too. High five!"),
 ("w6d4", "city", "please-help", "When I Feel Lost", "lost-sheep", "please-help-v1", "mg_w3d1_help_with",
  ["Uh oh, {kidName}. In the big city I lost my bird friend!", "The shepherd looked for one little sheep. God looks for us like that."],
  "Found! God always finds us. Thank you, God."),
 ("w6d5", "school", "others", "Being a Friend", "jesus-children", "for-others-v1", "mg_w3d6_friends",
  ["School again, {kidName}! Someone is sitting all alone at lunch.", "Jesus loved kids and said: come to me. Let's be that kind of friend."],
  "A new friend is a gift. Go say hi tomorrow!"),
 ("w6d6", "garden", "sorry", "Coming Home", "prodigal-son", "sorry-v1", "mg_w2d3_after_mistake",
  ["Hi {kidName}. I broke a flower pot today and hid in the garden.", "Then I remembered: God runs to hug us when we say sorry."],
  "Sorry makes hearts new. See you tomorrow."),
 ("w6d7", "pond", "review", "Everywhere Prayer", "two-houses", "world-complete-v1", "mg_w1d7_review",
  ["We prayed in the kitchen, the park, the car, everywhere, {kidName}!", "Now you know: any place is a praying place. Let's build on rock!"],
  "World two complete! The pond is glowing. You did it!"),
]
have = {l["id"] for l in d["lessons"]}
for lid, scene, skill, title, story, pr, mg, intro, bye in W2:
    if lid in have: continue
    beats = [
        say(intro[0], "wave_hello", f"{lid}_01.mp3", "happy"),
        say(intro[1], "talk_a", f"{lid}_02.mp3"),
        {"type": "story", "storyId": story},
        {"type": "repeat_after_me", "prayerId": pr, "clip": "pray_hands"},
        {"type": "minigame", "minigameId": mg},
        {"type": "listen_timer", "seconds": 20, "text": "Now let's be quiet. Breathe in… breathe out… God is right here.", "audio": "quiet_breathe_20.mp3", "clip": "kneel_pray"},
        {"type": "reward", "lantern": 1},
        say(bye, "celebrate", f"{lid}_04.mp3", "happy"),
    ]
    d["lessons"].append({"id": lid, "week": lid[:2], "day": int(lid[3]), "skillId": skill, "title": title, "free": False, "scene": scene, "beats": beats})

story_ids = [s["id"] for s in d["stories"]]
k = 0
for l in d["lessons"]:
    if l.get("routine", "any") != "any" or not l["id"].startswith(("w1", "w2", "w3", "w4")): continue
    if "story" not in [b["type"] for b in l["beats"]]:
        l["beats"].insert(2 if len(l["beats"]) > 2 else 1, {"type": "story", "storyId": story_ids[k % len(story_ids)]}); k += 1
    if "listen_timer" not in [b["type"] for b in l["beats"]]:
        ri = next(i for i, b in enumerate(l["beats"]) if b["type"] == "reward")
        l["beats"].insert(ri, {"type": "listen_timer", "seconds": 20, "text": "Let's be quiet for a moment. God is listening.", "audio": "quiet_20.mp3", "clip": "kneel_pray"})
    l.setdefault("scene", "pond")

d["ui"].update({"todayTitle": "Today's Prayer Moment", "storiesTitle": "Stories", "placesTitle": "Places", "pondTitle": "My Pond", "bedtimeTitle": "Bedtime",
    "comeBackTomorrow": "You did today's prayer! Come back tomorrow.", "tomorrowHint": "Until then: a story, a place, or the pond?",
    "storyPage": "Next page", "theEnd": "The end", "locked": "Soon"})
d["version"] = "0.7.0"
json.dump(d, open(p, "w"), indent=2, ensure_ascii=False); open(p, "a").write("\n")
print("stories", len(d["stories"]), "scenes", len(d["scenes"]), "lessons", len(d["lessons"]), "prayers", len(d["prayers"]))
