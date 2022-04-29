const Meeting = require('../schemas/meeting');
const MeetingMember = require('../schemas/meetingMember');
const User = require('../schemas/user');
const moment = require('moment')
require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");

/*
    TODO 1. cookie에 유저 정보가 담기면 db에서 유저 검사 후 meetingMasterId 값으로 지정
         2. 모임은 한 사람당 하나만 만들 수 있기 때문에 만드려는 유저가 이미 만든 모임이 있는지 확인
         3. 기본 모임 이미지 협의 볼 것. url 형식이 아닐 수 있음.
         4. 카테고리, 지역 올바른 값인지 확인
 */
async function createMeeting(req, res) {
    const { meetingName, meetingCategory, meetingLocation, meetingIntro, meetingLimitCnt } = req.body;
    let meetingImage = "";
    if (req.file) {
        meetingImage = req.file.location;
    } else {
        meetingImage = "https://img.lovepik.com/element/40135/2302.png_300.png";
    }

    await Meeting.create({
        meetingMasterId: 1,
        meetingName,
        meetingCategory,
        meetingLocation,
        meetingImage,
        meetingIntro,
        meetingLimitCnt,
        regDate: moment().format('YYYY-MM-DD HH:mm:ss')
    });

    res.status(201).json({ result: true, message: '모임 생성 성공' });
}

async function getMeetingInfo(req, res) {
    const { meetingId } = req.params;

    // 모임 정보
    const meetingInfo = await Meeting.findOne({ meetingId });
    // 모임 마스터의 프로필 정보
    const meetingMasterProfile = await User.findOne({ userId: meetingInfo.meetingMasterId });
    // 모임에 가입된 유저들
    const meetingUsers = await MeetingMember.find({ meetingId });
    // 모임에 가입된 유저들 고유 id
    const meetingUsersId = meetingUsers.map(result => result.meetingMemberId);
    // 모임에 가입된 유저들 정보
    // TODO 현재는 모임 마스터 정보가 제일 위에 올라와서 skip(1)로 마스터 정보를 제외하고 limit(3)으로 3명만 정보가 나오게 되어있지만 기획에 따라 수정 필요
    const meetingUsersProfile = await User.find(
        { userId: meetingUsersId },
        { userId: true, username: true, profileImage: true, statusMessage: true, _id: false }
    ).skip(1).limit(3);

    res.status(200).json({
        result: true,
        message: '모임 페이지 모임정보 조회 성공',
        data: {
            meetingId: meetingInfo.meetingId,
            meetingName: meetingInfo.meetingName,
            meetingCategory: meetingInfo.meetingCategory,
            meetingLocation: meetingInfo.meetingLocation,
            meetingImage: meetingInfo.meetingImage,
            meetingIntro: meetingInfo.meetingIntro,
            meetingUserCnt: meetingUsers.length,
            meetingLimitCnt: meetingInfo.meetingLimitCnt,
            meetingMasterProfile: {
                userId: meetingMasterProfile.userId,
                nickname: meetingMasterProfile.username,
                profileImage: meetingMasterProfile.profileImage,
                statusMessage: meetingMasterProfile.statusMessage
            },
            together: meetingUsersProfile
        }
    });
}

module.exports = {
    createMeeting,
    getMeetingInfo
};