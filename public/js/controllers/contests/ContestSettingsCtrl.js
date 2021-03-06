var app = angular.module('Contests');
app.controller('ContestSettingsController', function ($scope, $stateParams, $interval, vcRecaptchaService, Languages, TimeState, ContestState, ContestAPI) {
  $scope.loading = false;

  $scope.contest = {
    problems: [],
    hasFrozen: false,
    hasBlind: false,
    isPrivate: false,
    watchPrivate: false,
    allowIndividual: true,
    allowTeam: true,
  };

  if ($stateParams.id) {
    $scope.isEdit = true;
    var loading = $interval(function() {
      if (!ContestState.loading) {
        $interval.cancel(loading);
        $scope.date_start = ContestState.date_start;
        $scope.contest = ContestState.editContest;
        $scope.contest.languages = _.mapValues(Languages, function(v, k) {
          return _.some($scope.contest.languages, function(o) { return o === k;}) ? 1 : 0;
        });
      }
    }, 200);
  }
  $scope.tab = 0;
  $scope.nextTab = function() {
    $scope.tab = $scope.tab+1;
  };
  $scope.changeTab = function(tab) {
    $scope.tab = tab;
  };

  var MIN_CONTEST_DURATION = 10 * 60 * 1000;
  var setFrozen = true, setBlind = true;
  $scope.validateTimeRange = function() {
    var now = TimeState.server.now.getTime();
    var date_start = $scope.date_start;
    var minTime = Math.min(
      now - 60 * 60 * 1000,
      (date_start && date_start.getTime()) || now
    );
    var c = $scope.contest;
    if (c.date_start && c.date_start.getTime) c.date_start = c.date_start.getTime();
    if (c.date_end && c.date_end.getTime) c.date_end = c.date_end.getTime();
    if (c.frozen_time && c.frozen_time.getTime) c.frozen_time = c.frozen_time.getTime();
    if (c.blind_time && c.blind_time.getTime) c.blind_time = c.blind_time.getTime();

    if (c.date_start) c.date_start += (60000 - c.date_start % 60000) % 60000;
    if (c.date_end) c.date_end += (60000 - c.date_end % 60000) % 60000;

    if (c.date_start) c.date_start = Math.max(c.date_start, minTime);
    if (c.date_end) c.date_end = Math.max(c.date_end, now + MIN_CONTEST_DURATION);
    if (!c.date_start || !c.date_end) return c.hasFrozen = c.hasBlind = false;

    c.date_end = Math.max(c.date_start + MIN_CONTEST_DURATION, c.date_end);
    if (setFrozen) c.frozen_time = c.date_end - 60 * 60 * 1000;
    if (setBlind) c.blind_time = c.date_end - 15 * 60 * 1000;

    if (c.hasBlind) {
      setBlind = false;
      if (c.blind_time >= c.date_end) {
        c.blind_time = c.date_end - 60 * 1000;
      }
    }
    if (c.hasFrozen) {
      setFrozen = false;
      if (c.hasBlind && c.frozen_time >= c.blind_time) {
        c.frozen_time = c.blind_time - 60 * 1000;
      } else if (c.frozen_time >= c.date_end) {
        c.frozen_time = c.date_end - 60 * 1000;
      }
    }

    c.frozen_time = Math.max(c.frozen_time, c.date_start);
    c.frozen_time = Math.min(c.frozen_time, c.date_end);

    c.blind_time = Math.max(c.blind_time, c.date_start);
    c.blind_time = Math.min(c.blind_time, c.date_end);
  };

  $scope.debounceValidation = _.debounce($scope.validateTimeRange, 500);

  $scope.validateForm = function() {
    var c = $scope.contest;
    if (!c) return;
    var validateData = c.name && c.date_start && c.date_end;
    var validateProblems = c.problems && c.problems.length > 0;
    var validateLanguages = _.some(c.languages, function(o) { return o === 1;});
    var validateOptions =
    (!c.isPrivate || (c.password) && c.password.length > 0) &&
    (c.allowIndividual || c.allowTeam);
    return validateData && validateLanguages && validateProblems && validateOptions;
  };

  function handleError() {
    $scope.loading = false;
    vcRecaptchaService.reload(0);
  }

  $scope.createOrEdit = function() {
    $scope.loading = true;
    $scope.contest.languagesArr = [];
    _.forEach($scope.contest.languages, function (v,k) {
      if (v === 1) $scope.contest.languagesArr.push(k);
    });
    if (!$stateParams.id) ContestAPI.create($scope.contest, handleError);
    else ContestAPI.edit(ContestState.id, $scope.contest, handleError);
  };
});
