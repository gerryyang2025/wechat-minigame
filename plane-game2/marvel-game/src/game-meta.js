'use strict';

module.exports = {
  title: 'Marvel Infinity Strike',
  subtitle: 'Touch-first superhero action platformer slice',
  description: 'Choose Iron Man, Thor, or Hulk. Move, jump, attack, use hero skills, and clear the first battlefield on mobile touch controls.',
  buildShareOptions: function (snapshot) {
    var heroName = snapshot && snapshot.heroName ? snapshot.heroName : 'your hero';
    var levelLabel = snapshot && snapshot.levelName ? snapshot.levelName : 'the first battlefield';
    return {
      title: 'Join ' + heroName + ' in ' + levelLabel,
      query: 'from=share'
    };
  }
};

