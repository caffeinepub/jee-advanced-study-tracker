import Map "mo:core/Map";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";


import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

// Specify migration in with clause

actor {
  // Types -------------------------------------------------------------------

  type Resource = {
    id : Text;
    name : Text;
    subject : Text;
    totalChapters : Nat;
  };

  type Chapter = {
    id : Text;
    resourceId : Text;
    name : Text;
    status : Text;
    totalQuestions : Nat;
    doneQuestions : Nat;
  };

  type Task = {
    id : Text;
    title : Text;
    description : Text;
    subjectTag : Text;
    dueDate : ?Int;
    status : Text;
  };

  type RevisionReminder = {
    id : Text;
    resourceId : Text;
    chapterId : Text;
    intervalDays : Nat;
    lastReviewed : Int;
  };

  type StudySession = {
    principal : Principal;
    dateKey : Text;
    totalSeconds : Nat;
    name : Text;
  };

  public type UserProfile = {
    name : Text;
  };

  // Utility Functions -------------------------------------------------------

  func taskAscendingByDueDate(t1 : Task, t2 : Task) : Order.Order {
    let t1Due = switch (t1.dueDate) {
      case (null) { 9_223_372_036_854_775_807 };
      case (?date) { date };
    };
    let t2Due = switch (t2.dueDate) {
      case (null) { 9_223_372_036_854_775_807 };
      case (?date) { date };
    };

    if (t1Due < t2Due) {
      #less;
    } else if (t1Due > t2Due) {
      #greater;
    } else {
      Text.compare(t1.id, t2.id);
    };
  };

  func computeDateKeyIST(nowNanos : Int) : Text {
    // Add 5.5 hours (19800 seconds) to convert UTC to IST
    let istOffsetNanos : Int = 19_800_000_000_000;
    let istNanos = nowNanos + istOffsetNanos;

    // Convert to seconds
    let istSeconds = istNanos / 1_000_000_000;

    // Calculate days since epoch
    let secondsPerDay = 86400;
    let days = istSeconds / secondsPerDay;

    // Calculate date components (simplified epoch calculation)
    // Days since 1970-01-01
    let year = 1970 + (days / 365);
    let dayOfYear = days % 365;
    let month = 1 + (dayOfYear / 30);
    let day = 1 + (dayOfYear % 30);

    // Format as YYYYMMDD
    let yearText = year.toText();
    let monthText = if (month < 10) { "0" # month.toText() } else { month.toText() };
    let dayText = if (day < 10) { "0" # day.toText() } else { day.toText() };

    yearText # monthText # dayText;
  };

  // State Variables ---------------------------------------------------------

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let userProfiles = Map.empty<Principal, UserProfile>();
  let resources = Map.empty<Text, Resource>();
  let chapters = Map.empty<Text, Chapter>();
  let tasks = Map.empty<Text, Task>();
  let revisionReminders = Map.empty<Text, RevisionReminder>();
  let studySessions = Map.empty<Text, StudySession>();

  // User Profile Management -------------------------------------------------

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get their profile");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Resource Management -----------------------------------------------------

  public query ({ caller }) func getResources() : async [Resource] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view resources");
    };
    resources.values().toArray();
  };

  public shared ({ caller }) func addResource(id : Text, name : Text, subject : Text, totalChapters : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add resources");
    };
    let resource : Resource = { id; name; subject; totalChapters };
    resources.add(id, resource);
  };

  public shared ({ caller }) func updateResource(id : Text, name : Text, subject : Text, totalChapters : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can update resources");
    };
    switch (resources.get(id)) {
      case (null) { Runtime.trap("Resource not found") };
      case (?_) {
        let resource : Resource = { id; name; subject; totalChapters };
        resources.add(id, resource);
      };
    };
  };

  public shared ({ caller }) func deleteResource(id : Text) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can delete resources");
    };
    resources.remove(id);
  };

  // Chapter Management ------------------------------------------------------

  public query ({ caller }) func getChaptersByResource(resourceId : Text) : async [Chapter] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view chapters");
    };
    let filtered = chapters.filter(func(_, c) { c.resourceId == resourceId });
    filtered.values().toArray();
  };

  public query ({ caller }) func getAllChapters() : async [Chapter] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view chapters");
    };
    chapters.values().toArray();
  };

  public query ({ caller }) func getTotalChapterCount() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view chapter count");
    };
    chapters.size();
  };

  public shared ({ caller }) func addChapter(id : Text, resourceId : Text, name : Text, totalQuestions : Nat, doneQuestions : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add chapters");
    };
    let chapter : Chapter = { id; resourceId; name; status = "Not Started"; totalQuestions; doneQuestions };
    chapters.add(id, chapter);
  };

  public shared ({ caller }) func updateChapterStatus(chapterId : Text, status : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update chapter status");
    };
    switch (chapters.get(chapterId)) {
      case (null) { Runtime.trap("Chapter not found") };
      case (?chapter) {
        let updated = { chapter with status };
        chapters.add(chapterId, updated);
      };
    };
  };

  public shared ({ caller }) func updateChapterQuestions(chapterId : Text, doneQuestions : Nat, totalQuestions : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update chapter questions");
    };
    switch (chapters.get(chapterId)) {
      case (null) { Runtime.trap("Chapter not found") };
      case (?chapter) {
        let updated = { chapter with doneQuestions; totalQuestions };
        chapters.add(chapterId, updated);
      };
    };
  };

  public shared ({ caller }) func deleteChapter(chapterId : Text) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can delete chapters");
    };
    chapters.remove(chapterId);
  };

  // Task Management ---------------------------------------------------------

  public shared ({ caller }) func createTask(title : Text, description : Text, subjectTag : Text, dueDate : ?Int) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create tasks");
    };

    let taskId = title # Time.now().toText();
    let task : Task = {
      id = taskId;
      title;
      description;
      subjectTag;
      dueDate;
      status = "Todo";
    };

    tasks.add(taskId, task);
    taskId;
  };

  public shared ({ caller }) func updateTask(taskId : Text, title : Text, description : Text, subjectTag : Text, dueDate : ?Int, status : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update tasks");
    };
    switch (tasks.get(taskId)) {
      case (null) { Runtime.trap("Task not found") };
      case (?_) {
        let updated : Task = { id = taskId; title; description; subjectTag; dueDate; status };
        tasks.add(taskId, updated);
      };
    };
  };

  public shared ({ caller }) func deleteTask(taskId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete tasks");
    };
    tasks.remove(taskId);
  };

  public query ({ caller }) func getTasks(filterStatus : ?Text) : async [Task] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view tasks");
    };

    let tasksArray = switch (filterStatus) {
      case (null) { tasks.values().toArray() };
      case (?status) {
        let filteredIter = tasks.filter(
          func(_, t) {
            t.status == status;
          }
        ).values();
        filteredIter.toArray();
      };
    };

    tasksArray.sort(taskAscendingByDueDate);
  };

  // Revision Algorithm ------------------------------------------------------

  public shared ({ caller }) func addRevisionReminder(id : Text, resourceId : Text, chapterId : Text, intervalDays : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add revision reminders");
    };
    let reminder : RevisionReminder = {
      id;
      resourceId;
      chapterId;
      intervalDays;
      lastReviewed = Time.now();
    };
    revisionReminders.add(id, reminder);
  };

  public shared ({ caller }) func deleteRevisionReminder(reminderId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete revision reminders");
    };
    revisionReminders.remove(reminderId);
  };

  public query ({ caller }) func getDueForRevision() : async [RevisionReminder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view revision data");
    };

    let now = Time.now();
    let dueReminders = revisionReminders.filter(
      func(_, reminder) {
        let daysSinceLastReview = (now - reminder.lastReviewed) / (24 * 60 * 60 * 1_000_000_000);
        daysSinceLastReview >= reminder.intervalDays;
      }
    );

    dueReminders.values().toArray();
  };

  public query ({ caller }) func getAllRevisionReminders() : async [RevisionReminder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view revision reminders");
    };
    revisionReminders.values().toArray();
  };

  public shared ({ caller }) func markRevisionComplete(reminderId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update revision data");
    };

    switch (revisionReminders.get(reminderId)) {
      case (null) { Runtime.trap("Revision reminder not found") };
      case (?reminder) {
        let updatedReminder = { reminder with lastReviewed = Time.now() };
        revisionReminders.add(reminderId, updatedReminder);
      };
    };
  };

  // Study Session Leaderboard -----------------------------------------------

  public shared ({ caller }) func recordStudyTime(seconds : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record study time");
    };

    let dateKey = computeDateKeyIST(Time.now());
    let sessionKey = caller.toText() # "#" # dateKey;

    let userName = switch (userProfiles.get(caller)) {
      case (?profile) { profile.name };
      case (null) { "Anonymous" };
    };

    switch (studySessions.get(sessionKey)) {
      case (?existingSession) {
        let updated : StudySession = {
          principal = caller;
          dateKey;
          totalSeconds = existingSession.totalSeconds + seconds;
          name = userName;
        };
        studySessions.add(sessionKey, updated);
      };
      case (null) {
        let newSession : StudySession = {
          principal = caller;
          dateKey;
          totalSeconds = seconds;
          name = userName;
        };
        studySessions.add(sessionKey, newSession);
      };
    };
  };

  public query ({ caller }) func getTodayLeaderboard() : async [{ name : Text; totalSeconds : Nat; principalText : Text }] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view leaderboard");
    };

    let todayDateKey = computeDateKeyIST(Time.now());

    let todaySessions = studySessions.filter(
      func(_, session) {
        session.dateKey == todayDateKey;
      }
    );

    let leaderboardArray = todaySessions.values().toArray();

    let sorted = leaderboardArray.sort(
      func(a : StudySession, b : StudySession) : Order.Order {
        if (a.totalSeconds > b.totalSeconds) {
          #less;
        } else if (a.totalSeconds < b.totalSeconds) {
          #greater;
        } else {
          #equal;
        };
      }
    );

    sorted.map(
      func(session : StudySession) : { name : Text; totalSeconds : Nat; principalText : Text } {
        {
          name = session.name;
          totalSeconds = session.totalSeconds;
          principalText = session.principal.toText();
        };
      }
    );
  };

  public query ({ caller }) func getMyTodaySeconds() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their study time");
    };

    let todayDateKey = computeDateKeyIST(Time.now());
    let sessionKey = caller.toText() # "#" # todayDateKey;

    switch (studySessions.get(sessionKey)) {
      case (?session) { session.totalSeconds };
      case (null) { 0 };
    };
  };
};
