const router = require('express').Router();
const mypageController = require('../controllers/mypageController');
const authMiddelware = require('../middlewares/auth-middlewares');

router.get(
    '/:userId/profile',
    authMiddelware,
    mypageController.getSelectMyProfile
); // 마이페이지 내 정보 조회
router.put('/', authMiddelware, mypageController.putUpdateMyIntro); // 마이페이지 내 상태메시지 수정
router.get(
    '/:userId/mymeeting',
    authMiddelware,
    mypageController.getSelectMyMeeting
); // 마이페이지 내가 만든 모임 조회
router.get(
    '/:userId/joinedmeeting',
    authMiddelware,
    mypageController.getSelectJoinedMeeting
); // 마이페이지 내가 가입된 모임 조회
router.get(
    '/:userId/mystudy',
    authMiddelware,
    mypageController.getSelectMyStudy
); // 마이페이지 내가 만든 스터디 조회
router.get(
    '/:userId/joinedstudy',
    authMiddelware,
    mypageController.getSelectJoinedStudy
); // 마이페이지 내가 참여한 스터디 조회

module.exports = router;
